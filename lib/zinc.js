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
	 *  which means that 'this' scope is dynamic to this function.
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
		this.set('arguments', Array.prototype.concat.apply([], arguments));

		if (err) {
			// ok, this is error, so 
			this.setError();
		} else {
			// great, no, error
		}

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
				// till detached is called, continuation is synchrone, and has
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
	AwesomeExecuter.prototype.collect = function (continuation) {

		var flow = this.flow;

		if (continuation.isError()) {
			flow.error(continuation.get('arguments'));
		} else {
			flow.addToReturn(continuation.get('arguments'));
		}
	};

	/**
	 * Thes method is using continuation object and gives its execute method to
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
			var args = item.argus.concat([continuation.execute]);

			try {
				fnc.apply(context, args);
			} catch (e) {
				// this is error, check if it's till our code
				if (false == continuation.isExecuted()) {
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
					this.collect(continuation);
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
				this.collect(continuation);
			} else {
				// handler is still not executed
				// which means that we have to stop our loop and wait
				// till the handler is going to be executed
				continuation.detach(function (c) {
					// giving handler to execute as next one
					this.collect(c);
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

	/**
	 * Will run function in series mode.
	 */
	Flow.prototype.run = function (cb, scope) {

		// get the context
		var context = this.getContext();

		var index = 0;

		var stack = this._stack;
		var returnResult = [];

		var globalError = null;

		var ae = new AwesomeExecuter({
			/**
			* This method defines which next function to execute
			*/
			next : function () {
				if (globalError) {
					// ok, previous function gave error
					// so, stop this story
					cb.call(context, globalError);
					return null;
				}
				// take the item from the stack
				var item = stack[index++];
				if (typeof item == 'function') {
					return {
						fnc: item,
						context: context,
						argus: []
					};
				} else if (!item) {
					// last item?
					// execute cb and quit
					cb.call(context, null, returnResult);
					return null;
				} else {
					throw new Error('Still not implemented');
				}
			},

			addToReturn: function (arr) {
				// skipping first value, since it's an null from the error
				var ret = arr.splice(1);
				if (ret.length == 0) {
					returnResult.push(null);
				} else if (ret.length == 1) {
					returnResult.push(ret[0]);
				} else {
					returnResult.push(ret);
				}
			},

			error: function (arr) {
				var err = arr[0];
				globalError = err;
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
