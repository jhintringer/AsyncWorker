self.AsyncWorker = function(controller) {
	let workerFn = function() {
		let local = {
			"__":"empty"
		};
		self.onmessage = function (event) {
			if(event.data.control && event.data.control === 'addFunction') {
				local[event.data.cmd] = new Function(event.data.fn);
			}
		};
	};
	workerFn = getFunctionContent(workerFn);
	let worker = new Worker(URL.createObjectURL(new Blob([getFunctionContent(workerFn)], {type: 'application/javascript'})));
	let local = {};
	let cache = {};
	for(let cmd in controller) {
		if(controller.hasOwnProperty(cmd)) {
			if(typeof controller[cmd] === 'function') {
				//workerFn = workerFn.replace('"__":"empty"', cmd+': function()'"__":"empty"');
				local[cmd] = function () {
					return new Promise(function (resolve, reject) {
						let __id__ = cmd+'_'+uuidv4();
						cache[__id__] = { resolve: resolve, reject: reject };
					});
				};
			} else {
				Object.defineProperty(local, cmd, {
					get: function() {
						return cache[cmd];
					},
					set: function(value) {
						if(typeof value === 'function') {
							local[cmd] = function () {
								let callArguments = arguments;
								return new Promise(function (resolve, reject) {
									let __id__ = cmd+'_'+uuidv4();
									cache[__id__] = { resolve: resolve, reject: reject };
									worker.postMessage({ id: __id__, cmd: cmd, arguments: callArguments });
								});
							};
						} else {
							cache[cmd] = value;
						}
						return cache[cmd];
					}
				});
			}
		}
	}
	worker.onmessage = function(event) {
		let __id__ = event.data.__id__;
		delete event.data.__id__;
		if(typeof cache[__id__] !== 'undefined') {
			cache[__id__].resolve(event.data);
		} else {
			console.error("Unhandled Message from AsyncWorker:", event.data);
		}
	};
	function getFunctionContent(fn) {
		let string = fn.toString();
		let lines = string.split("\n");
		lines.pop();
		lines.shift();
		return lines.join("\n");
	}
	function uuidv4(){return([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,function(e){return(e^crypto.getRandomValues(new Uint8Array(1))[0]&15>>e/4).toString(16)})};
	return local;
};
