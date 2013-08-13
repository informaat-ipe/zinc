# Zinc.js

Asynchronous control-flow library for JavaScript. Works for both browser and
node.js

The main difference between other asynchronous control-flow libraries in the way zinc.js
handles the execution of the callbacks, which helps to prevent "maximum stack size exedded" error in applications which heavily use callback pattern.

The usage is simple. Add couple of functions to the zinc-flow. If needed, define context for them to execute and after that call `run` with the
final-callback as first argument.

```javascript
var flow = zinc.create();

flow.add(function (next) { return next(); });
flow.add(function (next) { return next(); });

flow
  .context(this)
  .run(function (err, results) {

  });
```

Functions will be executed one after another whenever callback `next` is executed.
When all the functions are executed, thi final-callback will receive error, in
case any of the functions was broken and results.

## Documentation

All methods of the zinc are chainable, except  `run`:

```javascript
var flow = zinc
  .create()
  .series()
  .context()
  .add(function (next) {
    return next();
  })
  .run();
```

### Add

There are couple of different possibilities to add functions to the zinc-flow,
but all of them use public method `add`.

First of all you can pass function directly to the zinc-flow.

```javascript
var flow = zinc.create();
flow.push(function (next) {
  return next();
});

flow.run();
```

It's also possible to pass an array of functions.

```javascript
var flow = zinc.create();

flow.add([

  function (next) {
    return next();
  },

  function (next) {
    return next();
  }
]);

flow.run();
```

Or even pass the object and method name to it

```javascript
var flow = zinc.create();

flow.add(this, 'methodOne');
flow.add(this, 'methodTwo');
flow.add(this, 'methodThree');

flow.run();
```

### Nesting

It's possible to nest zinc flows one in another in order to create more
complex control-flows:

```javascript
var child = zinc.create();

child.add(function (next) { 
  return next()
});

var parent = zinc.create();

parent.add(function (next){
  return next();
});

parent.add(child);

parent.add(function (next){
  return next();
});

parent.run();
```


### Waterfall

Zinc flow can run in a waterfall mode. It's similar to the series, except that
arguments which are passed to the handler are given to the next function on the
flow. Arguments of the last handler are passed to the final callback.

Waterfall can be activated by calling waterfall method on the flow intsance.


```javascript
var flow = zinc.create();

flow.waterfall();

flow.add(function (next) {
  return next(null, 'one', 'two', 'three');
});

flow.add(function (firstArgument, secondArgument, thirdArgument, next) {
  // firstArgument -> 'one'
  // secondArgument -> 'two'
  // thirdArgument -> 'three'
  return next(null, 'one-one');
});

flow.run(function (err, result) {
  // result is 'one-one'
});
```

In case the last handler passes multiple arguments to the final-callback, then
result variable will be an array, instead of the one argument object.

```javascript
var flow = zinc
  .create()
  .waterfall();

flow.add(function (next) {
  return next(null, 'one-one', 'two-two');
});

flow.run(function (err, result) {
  // result is ['one-one', 'two-two' ]
});
```

#### Nesting

When nesting waterfall in series flow, the last result of the waterfall flow will be also available in the final-callback

```javascript
var child = zinc
  .create()
  .waterfall();

child.add(function (next) {
  return next(null, 'child-one');
});

child.add(function (argOne, next) {
  // argOne -> 'child-one'
  return next(null, 'child-two', 'child-three');
});

var flow = zinc.create();

flow.add(function (next) {
  return next(null, 'one');
});

flow.add(child);

flow.add(function (next) {
  return next(null, 'three');
});

flow.run(function (err, result) {
  // result is [
  // 'one',
  // ['child-two', 'child-three' ],
  // 'three'
});
```

### this Context / Execution scope

It's possible to configure zinc-flow to use the same execution context for all the handlers in
that flow, without need of using `bind` or caching `this` variable.

context method will do the trick.

```javascript
Some.protoype.doit = function () {

  var flow = zinc.create();
  flow.context(this);

  flow.add(function (next) {
    // this will refer to the instance of Some object
    return next();
  });

  flow.run();
};
```


In case context is not set, zinc will create empty isolated context for every
flow. Which means, that even if you will use `this` in a flow it wont leak to
the global and can be used as storage of variables. Let's check the example:


```javascript
var runMe = function () {

  var flow = zinc.create();

  flow.add(function (next) {

    // this will refer to isolated scope
    this.someObject = new SomeObject();
    
    return next();
  });

  flow.add(function (next) {
    // because this refers to the separate scope, we can use it to store and
    // retrieve some information inside flow

    this.someObject.someAsyncCall(next);
  });

  flow.run();
};
```




