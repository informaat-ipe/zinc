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
		// included directly via <script> tag
        this.zinc = zinc;
    }

}(function () {

	var getHandler = function (next) {
		var executed = false;
		var asynchronous = false;
		var args = null;

		var handler = function (err) {

			// do check for handler execution and stop working if it's
			// already executed
			if (executed) {
				var e = new Error('Handler is called two times. This is NOT GOOD');
				console.error(e);
				return false;
			}

			executed = true;

			if (asynchronous) {
				// this is asynchronous  flow
				// we are already detached from the thread and have connection
				// to the executer through the code flom, only through the
				// next;
				if (err) {
					// ok, this is error, so execute finalCallback
					// atonce
					return next(err);
				} else {
					// ok, we are after execution, it means it is a async
					// call,
					// great, execute next one
					var result = Array.prototype.splice.call(arguments, 1, arguments.length);
					return next(null, result);
				}
			} else {
				// what shall we do with error?;
				if (err) {
					// it's a synced flow, 
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
			// asynchronous flow
			asynchronous = true;
		};

		return handler;
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

		this.id = new Date().getTime() +'_'+ Math.random()
	}

	AwesomeExecuter.prototype.next = function (err, ret) {

		var stack = this.stack;
		var context = this.context;

		// chekcing error
		if (err) {
			return this.finalCallback.call(context, err);
		} else if (ret) {
			this._results.push(ret.length == 1 ? ret[0] : ret);
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

			try {
				fnc.call(context, handler);
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
				this._results.push(ret.length == 1 ? ret[0] : ret);
			} else {
				// handler is still not executed
				// which means that we have to stop our loop and wait
				// till the handler is going to be executed
				handler.detach();
				// it's important to stop here, since otherwise, in
				// detached state it will contintue and will execute
				// finalCallback
				return;
			}
		}

		if (0 === stack.length) {
			return this.finalCallback.call(context, null, this._results);
		}
	};


	/**
	 * This is an amazing async runner which will help me to prevent all the fucking
	 * boring maximum stack size exceeded errors. Also it's configurable and
	 * chainable and has all this nifty stuff which I use in daily work. Why
	 * my own library again? Because it follows the patters i use and
	 * principles.
	 */
	function Runner() {
		this._stack = [];	
	}

	/**
	 * Alias to the add method
	 */
	Runner.prototype.push = function (fnc) {
		return this.add(fnc);
	};

	/**
	 * Add one function or array of functions to this stack;
	 */
	Runner.prototype.add = function (fnc, methodName) {
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
		} else if (fnc instanceof Runner) {
			// ok, this is also runner
			this._stack.push(function (h) {
				fnc.run(h);
			});
		} else if (arguments.length == 2) {
			if (fnc[methodName]) {
				this._stack.push(function (h) {
					fnc[methodName](h);
				});
			} else {
				console.warn('Method ' + methodName + ' doesn\'t exist in object ' + fnc);
			}
		} else {
			// well, whatever :)
		}

		return this;
	};

	/**
	 * Gives the context object which will be used to execute the functios.
	 * If context was not set before than global context is givven back.
	 * @return <object>
	 */
	Runner.prototype.getContext = function () {
		if (this._context) {
			return this._context;
		} else {
			var ctx = null;
			(function () {
				ctx = this;
			})();
			return ctx;
		}
	};

	/**
	 * Set the context in which all the functions are going to be executed
	 * @param <object> context - Context to be used at the mometn of the
	 * executin
	 */
	Runner.prototype.context = function (context) {
		this._context = context;
		return this;
	};

	Runner.prototype.series = function (cb) {
		return this.run(cb);
	};

	/**
	 * Will run function in series mode.
	 */
	Runner.prototype.run = function (cb, scope) {

		// get the context
		var context = this.getContext();

		// prevent more runs
		this.run = function () {};
		
		var ae = new AwesomeExecuter(context, this._stack, cb);
		ae.next();
	};

	return {

		series: function (stack, finalCallback) {
			var runner = new Runner();	

			runner
				.add(stack)
				.run(finalCallback);
		},

		create: function () {
			return new Runner();	
		}
	};
});