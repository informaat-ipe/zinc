/*jshint indent:4, node: true, strict: false*/
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
				this[name] = function (msg) {};
			}, this);
		}
	};

	// default behaviour
	log.disable();

	var getHandler = function (next) {
		var executed = false;
		var asynchronous = false;
		var args = null;

		var e;
		var message = 'Handler is executed two times';

		var handler = function (err) {

			// do check for handler execution and stop working if it's
			// already executed
			if (executed) {
				var newStack = new Error(message);
				log.error(message  + '\n' + '1) ' + e.stack + '\n' + '2) ' + newStack.stack);
				throw e;
			} else {
				// creating error object in order to remember our execution
				// point for the first time
				e = new Error(message);
			}

			executed = true;

			if (asynchronous) {
				// this is asynchronous  flow
				// we are already detached from the thread and have no connection
				// to the executer through the code flow, only through the
				// next;
				if (err) {
					// ok, this is error, so execute _next with error
					return next(err);
				} else {
					// great, no, error, so, collect resuts and execute next
					// with the renult
					var result = Array.prototype.splice.call(arguments, 1, arguments.length);
					return next(null, result);
				}
			} else {
				// handler is executed before control returned back to the
				// executer
				if (err) {
					// and error is passed
					// because it's a synced flow, 
					// throw this error which will be picked up by the
					// try catch loop of the executer itself
					throw err;
				} else {
					// cache arguments which are going to be fetched by the
					// executer;
					args = Array.prototype.splice.call(arguments, 1, arguments.length);
				}
			}
		};

		handler.getReturn = function () {
			return args;
		};

		handler.isExecuted = function () {
			return executed;
		};

		handler.detach = function () {
			// executer detached us from the thread, which means we are now in
			// asynchronous flow and will be executed later
			asynchronous = true;
		};

		return handler;
	};

	var WaterfallMixin = {
		getArguments: function () {
			
			// this is only for waterfall
			var parameters = this._results.pop();
			if (parameters) {
				return [].concat(parameters);
			}

			return [];
		},

		getReturnValues: function () {
			if (0 !== this._results.length) {
				var val = this._results[0];
				if (1 == val.length) {
					return val[0];
				} else {
					return val;
				}
			} else {
				return [];
			}
		}
	};

	function AwesomeExecuter(context, stack, finalCallback) {

		this.stack = stack;
		this.context = context;

		this._results = [];

		if (typeof finalCallback == 'function') {
			this.finalCallback = finalCallback;
		} else {
			this.finalCallback = function () {};
		}

		this._next = this.next.bind(this);

		this.id = new Date().getTime() + '_' + Math.random();
	}

	AwesomeExecuter.prototype.addToReturn = function (ret) {
		this._results.push(ret);
	};

	AwesomeExecuter.prototype.getArguments = function () {
		return [];
	};

	AwesomeExecuter.prototype.getReturnValues = function () {
		return this._results.map(function (i) {
			if (1 == i.length) {
				return i[0];
			} else {
				return i;
			}
		});
	};

	AwesomeExecuter.prototype.next = function (err, ret) {

		var stack = this.stack;
		var context = this.context;

		// chekcing error
		if (err) {
			return this.finalCallback.call(context, err);
		} else if (ret) {
			// at this moment, handler has called _next and passed it's result
			// to here
			this.addToReturn(ret);
		}

		while (0 !== stack.length) {

			var fnc = stack.shift();
			// ok, check this out
			// if this fnc will execute handler before it comes back it means that
			// our fnc is not asynchronous, so there is no reason to follow the
			// flow inside the handler itself and creating extra stack item, it
			// would be better to continue our flow in synced way
			// so, pass the handler and watch, who is going to be faster
			// he or we...
			var handler = getHandler(this._next);

			var args = this.getArguments();
			args.push(handler);

			try {
				fnc.apply(context, args);
			} catch (e) {
				// that's easy :) error, give it back to the callback
				return this.next(e);
			}

			if (handler.isExecuted()) {
				// great, handler already is executed
				// so this is a normal synced function.
				// going further with while loop
				// but first push the results
				ret = handler.getReturn();
				this.addToReturn(ret);
			} else {
				// handler is still not executed
				// which means that we have to stop our loop and wait
				// till the handler is going to be executed
				handler.detach();
				// it's important to stop here, otherwise, in
				// detached state it will continue and might execute finalCallback if it's a last item
				return;
			}
		}

		if (0 === stack.length) {
			var returnValue = this.getReturnValues();
			return this.finalCallback.call(context, null, returnValue);
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
	}

	/**
	 * Alias to the add method
	 */
	Flow.prototype.push = function (fnc) {
		return this.add(fnc);
	};

	/**
	 * Add one function or array of functions to this stack;
	 */
	Flow.prototype.add = function (fnc) {
		if (Array.isArray(fnc)) {
			// ok, this is array of the functions
			// append all the functions
			fnc.forEach(function (fnc) {
				if (typeof fnc == 'function') {
					this._stack.push(fnc);
				}
			}, this);
		} else if (typeof fnc == 'function') {
			this._stack.push(fnc);
		} else if (fnc instanceof Flow) {
			// ok, this is also runner
			this._stack.push(function (h) {
				fnc.run(arguments[arguments.length - 1]);
			});
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

	/**
	 * Will run function in series mode.
	 */
	Flow.prototype.run = function (cb, scope) {

		// get the context
		var context = this.getContext();

		// prevent more runs
		this.run = function () {};
		
		var ae = new AwesomeExecuter(context, this._stack, cb);
		if (this.mode() == 'waterfall') {
			// mixin getWaterfallArguments :)
			ae.getArguments = WaterfallMixin.getArguments;
			ae.getReturnValues = WaterfallMixin.getReturnValues;
		}
		ae.next();
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
