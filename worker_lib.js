self.AsyncWorker = function(controller, name) {
	if(typeof name === 'undefined') name = 'AsyncWorker';
	let workerFn = function() {
		let cache = {};
		let local = {};
		let updateValues = true;
		self.onmessage = function (event) {
			if(event.data.control) {
				if(event.data.control === 'load') {
					let data = JSON.parse(event.data.data);
					for(let cmd in data) {
						if(data.hasOwnProperty(cmd)) {
							if(data[cmd].type === 'function') {
								local[cmd] = new Function(...data[cmd].arguments, data[cmd].content);
							}
							else {
								cache[cmd] = data[cmd].content;
								updateValues = false;
								Object.defineProperty(local, cmd, {
									get: function() {
										return cache[cmd];
									},
									set: function(value) {
										cache[cmd] = value;
										self.updateRespond(cmd, cache[cmd]);
										return cache[cmd];
									}
								});
								local[cmd] = cache[cmd];
								updateValues = true;
							}
						}
					}
				} else if(event.data.control === 'update') {
					if(event.data.hasOwnProperty('fn')) local[event.data.cmd] = new Function(...event.data.arguments, event.data.content);
					else local[event.data.cmd] = event.data.value;
				}
			} else {
				if(typeof local[event.data.cmd] === 'function') {
					try {
						let result = local[event.data.cmd](...event.data.arguments);
						if(typeof event.data.id !== 'undefined') self.respond(event.data.id, result);
					} catch(e) {
						if(typeof event.data.id !== 'undefined') self.respondError(event.data.id, e.message);
					}
				} else {
					local[event.data.cmd] = event.data.value;
				}
			}
		};
		self.respond = function(id, data) {
			self.postMessage({ id: id, data: data });
		};
		self.respondError = function(id, msg) {
			self.postMessage({ id: id, error: msg });
		};
		self.updateRespond = function(cmd, value) {
			if(!updateValues) return;
			self.postMessage({ cmd: cmd, value: value });
		};
	};
	let worker = new Worker(URL.createObjectURL(new Blob([getFunctionContent(workerFn)], {type: 'application/javascript'})), { name: name });
	let local = {};
	let cache = {};
	let updateValues = false;
	for(let cmd in controller) {
		if(controller.hasOwnProperty(cmd)) {
			Object.defineProperty(local, cmd, {
				get: function() {
					return cache[cmd];
				},
				set: function(value) {
					cache[cmd] = getValueForWorker(cmd, value, updateValues);
					return cache[cmd];
				}
			});

			local[cmd] = controller[cmd];
			if(typeof controller[cmd] === 'function') {
				controller[cmd] = { type: 'function', content: getFunctionContent(controller[cmd]), arguments: getFunctionArguments(controller[cmd]) };
			} else {
				controller[cmd] = { type: 'variable', content: controller[cmd] };
			}

		}
	}
	updateValues = true;
	worker.onmessage = function(event) {
		if(typeof event.data.id !== 'undefined') {
			let id = event.data.id;
			if(typeof cache[id] !== 'undefined') {
				if(typeof event.data.error === 'undefined')
					cache[id].resolve(event.data.data);
				else
					cache[id].reject(event.data.error);
			}
			else {
				console.error("Unhandled Message from AsyncWorker:", event.data);
			}
		} else if(typeof event.data.cmd !== 'undefined') {
			updateValues = false;
			cache[event.data.cmd] = event.data.value;
			updateValues = true;
		}
	};
	function getValueForWorker(cmd, value, update) {
		if(typeof value === 'function') {
			if(update === true) worker.postMessage({ control: 'update', cmd: cmd, fn: getFunctionContent(value) });
			return function() {
				let callArguments = [];
				for(let a=0; a<arguments.length; a++) callArguments.push(arguments[a]);
				return new Promise(function (resolve, reject) {
					let id = cmd+'_'+uuidv4();
					cache[id] = { resolve: resolve, reject: reject };
					worker.postMessage({ id: id, cmd: cmd, arguments: callArguments });
				});
			};
		} else {
			if(update === true) worker.postMessage({ control: 'update', cmd: cmd, value: value });
			return value;
		}
	}

	worker.postMessage({ control: 'load', data: JSON.stringify(controller) });
	function getFunctionContent(fn) {
		let string = fn.toString();
		let lines = string.split('{');
		lines.shift();
		string = lines.join('{');
		lines = string.split('}');
		lines.pop();
		string = lines.join('}');
		return string.trim();
	}
	function getFunctionArguments(fn) {
		let string = fn.toString();
		let lines = string.split('{');
		let call = lines.shift();
		lines = call.split('(');
		lines = lines[1].split(')');
		call = lines[0];
		call = call.replace(/[\s\r\n]/g, '');
		return call.split(',');
	}
	function uuidv4(){return([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,function(e){return(e^crypto.getRandomValues(new Uint8Array(1))[0]&15>>e/4).toString(16)})};
	return local;
};
