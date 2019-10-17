# AsyncWorker
A Worker Library for JavaScript to simplify the communication process.

## Example

Add the **worker_lib.js** Script to your document and initialize the Worker like this:
```javascript
// Initialize Worker with Properties and Functions
let work = new AsyncWorker({
    sayHello: helloFunction,
    changeNameTo: function(newName) {
        this.your_name = newName;
        return true; // Return Values are always passed to the Promise's Resolve
    },
    your_name: 'unknown'
});

function helloFunction(name) {
    console.info('Hello', this.your_name, 'from', name);
}

// Changing Properties:
work.your_name = 'Genius';

// Calling Functions:;
work.sayHello('Script');

work.changeNameTo('John Doe').then(function() {
    console.log('Your Name is:', work.your_name);

    work.sayHello('Someone');
});
```

# License

This Project is licensed under the MIT License.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions: