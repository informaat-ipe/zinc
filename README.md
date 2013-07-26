# Zinc.js

Asynchronous control-flow library for JavaScript. Works for both browser and
node.js

The main difference between other asynchronous control-flow libraries in the way zinc.js
handles the execution of the callbacks, which helps to prevent "maximum stack size exedded" error in applications which heavily use callback pattern.

The usage is simple. Add couple of functions to the zinc-stack. If needed, define context for them to execute and after that call `run` with the
final-callback as first argument.

```javascript
var stack = zinc.create();

stack.add(function (h) { return h(); });
stack.add(function (h) { return h(); });

stack
  .context(this)
  .run(function (err, results) {

  });
```

Functions will be executed one after another whenever callback `h` is executed.
When all the functions are executed, thi final-callback will receive error, in
case any of the functions was broken and results.

## Documentation

All methods of the zinc are chainable, except  `run`:

```javascript
var stack = zinc
  .create()
  .context()
  .add(function (h) {
    return h();
  })
  .run();
```

### Add

There are couple of different possibilities to add functions to the zinc-stack,
but all of them use public method `add`.

First of all you can pass function directly to the zinc-stack.

```javascript
var stack = zinc.create();
stack.push(function (h) {
  return h();
});

stack.run();
```

It's also possible to pass an array of functions.

```javascript
var stack = zinc.create();

stack.add([

  function (h) {
    return h();
  },

  function (h) {
    return h();
  }
]);

stack.run();
```

Or even pass the object and method name to it

```javascript
var stack = zinc.create();

stack.add(this, 'methodOne');
stack.add(this, 'methodTwo');
stack.add(this, 'methodThree');

stack.run();
```

### Context

It's possible to configure stack to use the same exaction context for all the handlers in
the stack, without need of using `bind`.

```javascript
Some.protoype.doit = function () {

  var stack = zinc.create();
  stack.context(obj);

  stack.add(function (h) {
    // this will refer to the obj
  });

  stack.run();
};
```


### Nesting

It's possible to nest zinc stacks one in another in order to create more
complex control-flows:

```javascript
var child = zinc.create();

child.add(function (h) { 
  return h()
});

var parent = zinc.create();

stack.add(function (h){
  return h();
});

parent.add(child);

stack.add(function (h){
  return h();
});

parent.run();
```



