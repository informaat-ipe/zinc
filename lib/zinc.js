/*jshint indent:4, node: true, strict: false, maxstatements:7 */
var XXX = {};

var ForEach = function (array, fnc) {
	this.arr = array.slice(0);
	this.executer = fnc;
};

var finalizeReturn = function (r) {
	return r.map(function (returnObject, index) {
		var length = returnObject.length;
		if (length == 1) {
			// there was only one argument
			// unpack it
			return returnObject[0];
		} else if (length > 1) {
			// multiple arguments, no unpack
			return returnObject;
		} else {
			return null;
		}
	});
};

/*global define */
!function (def) {
	var zinc = def();

    if (typeof define !== 'undefined' && define.amd) {
		// AMD / RequireJS
        define([], function () {
            return zinc;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
		// Node.js
        module.exports = zinc;
    } else {
		var global = (function () { return this; })();
		// included directly via <script> tag
        global.zinc = zinc;
    }

}(function () {

	var log = {
		enable: function () {
			['error', 'warn'].forEach(function (name) {
				this[name] = function (msg) {
					console[name](msg);
				};
			}, this);
		},

		disable: function () {
			['error', 'warn'].forEach(function (name) {
				this[name] = function () {};
			}, this);
		}
	};

	// default behaviour
	log.disable();

	function AwesomeExecuter(flow) {
		this.flow = flow;
		this.id = new Date().getTime() + '_' + Math.random();
	}

	/**
	 * _Handler function should be binded to continuation object
	 *  which means that 'this' scope is dynamic in this function.
	 *  _Handler operates on continuation object by manipulating its state.
	 *  From this state you can define whether continuation is detached or not,
	 *  executed or not and have errors or not
	 */
	AwesomeExecuter.prototype._Handler =  function (err) {
		var message = 'Handler is executed two times';

		// do check for handler execution and stop working if it's
		// already executed
		if (this.isExecuted()) {
			var e = this.get('execution-point');
			var newStack = new Error(message);
			log.error(message  + '\n' + '1) ' + e.stack + '\n' + '2) ' + newStack.stack);
			// XXX: curious where this error will end-up
			throw e;
		} else {
			// creating error object in order to remember our execution
			// point for the first time
			this.set('execution-point', new Error(message));
		}

		this.setExecuted();

		// cache arguments which are going to be fetched by the
		// executer
		var arrayOfArguments = Array.prototype.slice.call(arguments, 0);

		this.set('arguments', arrayOfArguments);

		if (err) {
			// ok, this is error, so 
			this.setError();
		} else {
			// great, no, error
		}

		// execute next on continuation object
		// if continuation is synced, this function is empty, otherwise it has
		// some stuff in it
		return this.next(this);
	};
	
	/**
	 * This method will give back new instance of the Contintuation object
	 * with 'execute' handler
	 * I use continuation and handler as separate entities in order to keep
	 * internal state of the _Handler inside AwesomeExecuter and not expose it
	 * to the outside.
	 */
	AwesomeExecuter.prototype.newContinuation = function () {

		var map = {};
		var continuation = {
			next: function () {
				// till detached is called, continuation is synchronous, and has
				// no next in it
			},

			// reference to the _Handler function
			execute: null,

			is: function (name) {
				return !!map[name];			
			},

			set: function (name, args) {
				map[name] = args || true;
			},

			get : function (name) {
				return map[name];
			},

			isError: function () {
				return this.is('error');
			},

			setError: function () {
				return this.set('error');
			},

			isExecuted: function () {
				return this.is('executed');
			},

			setExecuted: function () {
				return this.set('executed');
			},

			isDetached: function () {
				return this.is('detached');
			},
			// executer detached us from the thread, which means we are now in
			// asynchronous flow and will be executed later
			detach : function (nextCall) {
				this.set('detached');
				this.next = nextCall;
			},

			block: function () {
				//XXX: don't know what to do with this thing yet...
			}
		};

		// binding new _Handler to the continuation object
		continuation.execute = this._Handler.bind(continuation);

		return continuation;
	};

	/**
	 * This function notifies flow about the stuff it has in continuation :)
	 */
	AwesomeExecuter.prototype.collect = function (continuation, item) {

		var flow = this.flow;

		if (continuation.isError()) {
			flow.error(continuation.get('arguments'));
		} else {
			item.output(continuation.get('arguments'));
//			flow.addToReturn(continuation.get('arguments'));
		}
	};

	/**
	 * This method is using continuation object and gives its execute method to
	 * the caller. When 'execute' method is called, based on the state of the
	 * continuation object AwesomeExecuter knows what to do next
	 */
	AwesomeExecuter.prototype.start = function () {

		var flow = this.flow;

		var item = null;

		while ((item = flow.next())) {

			// ok, check this out
			// if this fnc will execute handler before it comes back it means that
			// our fnc is not asynchronous, so there is no reason to follow the
			// flow inside the handler itself and creating extra stack item, it
			// would be better to continue our flow in synced way
			// so, pass the handler and watch, who is going to be faster
			// he or we...
			var continuation = this.newContinuation();

			var fnc = item.fnc;
			var context = item.context;
			var input = item.input();
			var args = input.concat([ continuation.execute ]);

			try {
				fnc.apply(context, args);
			} catch (e) {
				console.log('this is wrong', e.stack);
				// this is error, check if it's till our code
				if (false === continuation.isExecuted()) {
					// great, it is still in synchronous mode and is before
					// handler is executed
					// we can expect that handler can be still executed later
					// in asynchronous mode!, but we don't care anymore, since
					// final will be already fired and code is broken. and code
					// can't be broken!!!!

					// blocking handler, so no one can execute it again
					continuation.block();

					// executing continuation to save error into the object
					continuation.execute(e);
					this.collect(continuation, item);
				} else {
					// ok, this is a bit difficult part
					// handler is already executed which means that code
					// somewhere broken after the execution...
					// XXX:
					console.log('UPS');
				}

				// NOT stopping executer from further execution
				// because flow.next will give us final callback for execution
				// continue with while loop
				continue;
			}

			if (continuation.isExecuted()) {
				// great, handler already is executed
				// so this is a normal synced function.
				// doing all this fancy glue stuff with flow and
				// going further with while loop
				this.collect(continuation, item);
			} else {
				// handler is still not executed
				// which means that we have to stop our loop and wait
				// till the handler is going to be executed
				continuation.detach(function (c) {
					// giving handler to execute as next one
					this.collect(c, item);
					// continue the execution
					this.start(flow);
				}.bind(this));

				// it's important to stop here, otherwise we will go next,
				// while previous is not done yet
				return;
			}
		}
	};


	/**
	 * This is an amazing async runner which will help me to prevent all the fucking
	 * boring maximum stack size exceeded errors. Also it's configurable and
	 * chainable and has all this nifty stuff which I use in daily work. Why
	 * my own library again? Because it follows the patters i use and
	 * principles.
	 */
	function Flow() {
		this._stack = [];	
		this._id  = 'Flow_' + Math.random();
	}

	Flow.prototype.getStack = function () {
		return this._stack.slice(0);
	};

	/**
	 * Alias to the add method
	 */
	Flow.prototype.push = function (fnc) {
		return this.add(fnc);
	};

	Flow.prototype.map = function (array, fnc) {
		this._stack.push(new ForEach(array, fnc));
		return this;
	};

	/**
	 * Add one function or array of functions to this stack;
	 */
	Flow.prototype.add = function (fnc) {
		if (Array.isArray(fnc)) {
			// ok, this is array of the functions
			// append all the functions
			fnc.forEach(function (fnc) {
				this.add(fnc);
			}, this);
		} else if (typeof fnc == 'function') {
			this._stack.push(fnc);
		} else if (fnc instanceof Flow) {
			// ok, this is also runner
			this._stack.push(fnc);
		} else {
			var message = 'Flow.add: Object ' + fnc + ' is not supported';
			log.error(message);
			throw new Error(message);
		}

		return this;
	};

	/**
	 * Gives the context object which will be used to execute the functios.
	 * If context was not set before than global context is givven back.
	 * @return <object>
	 */
	Flow.prototype.getContext = function () {
		if (this._context) {
			return this._context;
		} else {
			this._context = {};
			return this.getContext();
		}
	};

	/**
	 * Set the context in which all the functions are going to be executed
	 * @param <object> context - Context to be used at the moment of the
	 * execution
	 * @param <object> context - Object to be used as execution context in
	 * handlers
	 */
	Flow.prototype.context = function (context) {
		this._context = context;

		return this;
	};

	/**
	 * Preconfigure zinc to run in series mode. This is chainable method
	 */
	Flow.prototype.series = function () {
		this._mode = 'series';

		return this;
	};

	/**
	 * Preconfigure zinc to run in waterfall mode. Method is chainable.
	 */
	Flow.prototype.waterfall = function () {
		this._mode = 'waterfall';

		return this;
	};

	/**
	 * Returns the current mode of the zinc. Can be 'waterfall' or 'series'.
	 * @return <string> Mode of the zinc stack
	 */
	Flow.prototype.mode = function () {
		return this._mode;
	};

	var OneFunctionIterator = function (fnc, context) {
		var out;
		var input;

		var theOne = {
			fnc: fnc,
			context: context,
			input: function () {
				return input || [];
			},

			output: function (rv) {
				// out has error as first argument
				out = rv.slice(1);
			}
		};
		return {
			next: function () {
				this.next = function () {
					return null;
				};
				return theOne;
			},
			setInput: function (inp) {
				input = inp;
			},
			getOutput: function () {
				return out;
			}
		};
	};

	var FlowIterator = function (flow) {
		var input;
		var index = 0;
		var stack = flow.getStack();
		var current;

		var r = [];
		var returnValue;

		return {
			getOutput: function () {
				return returnValue;
			},

			setInput: function (i) {
				input = i;
			},

			next: function () {
				// ok, there is current
				// grab one and pass the input to this thing
				if (!current) {
					var item = stack[index++];
					// iterator self is responsible for collecting the results
					var args = null;
					if (flow.mode() == 'waterfall') {
						// check if there is input available
						if (input) {
							// ok, we have input, so give an input
							args = input;
							input = null;
						} else {
							args = r.pop();
							console.log('will have to do args', args);
						}
					}

					args = args || [];
					current = XXX._getIterator(item, flow.getContext());

					if (current) {
						// give it an input
						current.setInput(args);
					}
				}

				if (current) {
					var next = current.next();
					if (next) {
						// just execute and wait
						return next;
					} else {
						// there are no more next items in this iterator
						// so, get the result of this iterator
						// and pass it to the next one, if it's there
						var output = current.getOutput();
						// out is an array with the arguments
						r.push(output);
						// getting next iterator
						// if we have more

						if (stack.length <= index) {
							// no more items
							// ok, there are no more items in it
							// so, finalize the result
							returnValue = finalizeReturn(r);
							if (flow.mode() == 'waterfall') {
//								returnValue = returnValue[0];
							}
							console.log('Will finilaze', returnValue);
							return null;
						} else {
							// dismiss current, and try next item
							current = null;
							// there are more elements
							return this.next();
						}
					}
				}
			}
		};
	};

	var ForEachIterator = function (forEachThing, context) {
		
		var index = 0;
		var stack = forEachThing.arr;
		var fnc = forEachThing.executer;

		var out = [];

		return {
			next: function () {
				// getting next item in the array
				var current = stack[index++];
				if (current) {
					// great, we have one here

					return {
						fnc: fnc,
						context: context,
						input: function () {
							// input is our current item
							return [ index-1, current ];
						},

						output: function (rv) {
							// out has error as first argument
							out.push(rv.slice(1));
						}
					};
				}

				// no more items,
				out = finalizeReturn(out);
				return null;
			},

			getOutput: function () {
				return out;
			},

			setInput: function () {
				// XXX:
				// this one is needed in case we are sitting inside waterfall
				//
			}
		};
	};


	XXX._getIterator = function (item, context) {

		if (!item) { return null; }

		if (typeof item == 'function') {
			return OneFunctionIterator(item, context);
		} else if (item instanceof Flow) {
			return FlowIterator(item);
		} else if (item instanceof ForEach) {
			// has different arguments collection process
			return ForEachIterator(item, context);
		}

		throw new Error('not supported type');
	};

	/**
	 * Will run function in series mode.
	 */
	Flow.prototype.run = function (cb, scope) {

		// get the context
		var context = this.getContext();

		var iterator = XXX._getIterator(this);

		var ae = new AwesomeExecuter({
			next : function () {
				if (this.hasError()) {
					// ok, error, execute callback and forget
					cb.call(context, this.getError());	
					return null;
				}

				var next = iterator.next();
				if (next) {
					return next;
				}

				// no more items in array
				// no error, well, in that case, take the returnResult
				// and execute callback
				var returnResult = iterator.getOutput();

				console.log('AND RETURN RESULT IS', returnResult);

				cb.call(context, null, returnResult);

				return null;
			},

			error: function (arr) {
				console.log('place error', arr);
				this._error = arr[0];
			},

			hasError: function () {
				return !!this._error;
			},

			getError: function () {
				return this._error;
			}
		});

		ae.start();
	};

	return {
		/**
		 *	Will show/hide logging information of warnings and errors.
		 *	By default zinc doesn't log to the console.
		 *	Usage: 
		 *	zinc.vebose(true|false);
		 */
		verbose: function (yez) {
			if (!!yez) {
				log.enable();
			} else {
				log.disable();
			}
		},

		series: function (stack, finalCallback) {
			var runner = new Flow();	

			runner
				.add(stack)
				.run(finalCallback);
		},

		/**
		 *  Will create new instance of the Flow.
		 */
		create: function () {
			return new Flow();	
		}
	};
});
