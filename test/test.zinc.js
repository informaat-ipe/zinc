/*jshint indent:4, node:true, strict:false*/
/*global describe:true, expect:true, it:true, zinc:true */

// var zinc = require('../lib/zinc');
var expect = chai.expect;

describe('Test Async Zinc', function () {


	describe('arguments passing', function () {
		
		describe('waterfall', function () {

			it('should pass one argument to the final-callback', function (done) {
				var flow = zinc
					.create()
					.waterfall();

				flow.push(function (h) {
					return h();
				});

				flow.push(function (h) {
					return h(null, 'two-one');
				});

				flow.run(function (err, result) {
					// result is now 'two-one'
					
					expect(err).to.be.not.ok;
					expect(result).to.be.deep.equal('two-one');

					return done();
				});
			});

			it('should pass one argument to the final-callback.async', function (done) {
				var flow = zinc
					.create()
					.waterfall();

				flow.push(function (h) {
					setTimeout(function () {
						return h();
					}, 0);
				});

				flow.push(function (h) {
					setTimeout(function () {
						return h(null, 'two-one');
					}, 0);
				});

				flow.run(function (err, result) {
					// result is now 'two-one'
					
					expect(err).to.be.not.ok;
					expect(result).to.be.deep.equal('two-one');

					return done();
				});
			});

			it('should pass multiple arguments to the final-callback', function (done) {
				var flow = zinc
					.create()
					.waterfall();

				flow.push(function (h) {
					return h();
				});

				flow.push(function (h) {
					return h(null, 'two-one', 'two-two');
				});

				flow.run(function (err, result) {
					// result is now ['two-one', 'two-two']

					expect(err).to.be.not.ok;
					
					expect(result).to.deep.equal(
						['two-one', 'two-two']
					);

					return done();
				});
			});

			it('should pass multiple arguments to the final-callback.async', function (done) {
				var flow = zinc
					.create()
					.waterfall();

				var results = [];

				
				flow.push(function (h) {
					setTimeout(function () {
						return h(null, 'one-one', 'one-two');
					}, 0);
				});

				flow.push(function (argOne, argTwo, h) {
					results.push([ argOne, argTwo ]);
					setTimeout(function () {
						return h(null, 'two-one', 'two-two');
					}, 0);
				});

				flow.run(function (err, result) {
					// result is now ['two-one', 'two-two']
					results.push(result);

					expect(err).to.be.not.ok;
					
					expect(results).to.deep.equal([
						['one-one', 'one-two'],
						['two-one', 'two-two']
					]);

					return done();
				});
			});

			it('should pass arguments from one call to another', function (done) {
				var flow = zinc
					.create()
					.waterfall();

				var results = [];
				
				flow.push(function (h) {
					return h(null, 'one-one', 'one-two');
				});

				flow.push(function (argOne, argTwo, h) {
					results.push([ argOne, argTwo ]);
					return h(null, 'two-one', 'two-two');
				});

				flow.run(function (err, result) {
					// result is now ['one-one', 'one-two']

					expect(err).to.be.not.ok;
					
					expect(results).to.deep.equal([
						['one-one', 'one-two']
					]);

					return done();
				});
			});

			it('should pass array as one argument in waterfall', function (done) {

				var flow = zinc.create().waterfall();

				var result = null;

				flow.add(function (next) {
					return next(null, [{
						'name': 'zinc'
					}]);
				});

				flow.add(function (arg, next) {
					result = arg;
					return next();
				});

				flow.run(function (err) {

					expect(result).to.deep.equal([{
						name: 'zinc'
					}]);

					return done();
				});
			});

		});

		describe('series', function () {

			it('should pass array as one argument to the final-callback', function (done) {
				var flow = zinc.create();

				flow.add(function (next) {
					return next(null, [{
						'name': 'zinc'
					}]);
				});

				flow.run(function (err, result) {
					expect(err).to.be.not.ok;

					expect(result).to.deep.equal([
						[{ name: 'zinc' }]
					]);

					return done();
				});
			});

			it('should pass oneobject without argument to the final-callback', function (done) {
				var flow = zinc.create();

				flow.add(function (next) {
					return next(null, {
						'name': 'zinc'
					});
				});

				flow.run(function (err, result) {
					expect(err).to.be.not.ok;

					expect(result).to.deep.equal([
						{ name: 'zinc' }
					]);

					return done();
				});
			});

			it('should collect results with one argument', function (done) {

				var flow = zinc.create();

				var arr = [];
				var expected = [];

				for (var i = 0; i < 10; i++) {
					expected.push(i);
					(function () {
						var index = i;
						arr.push(function (h) {
							// ok, this time asynced
							return h(null, index);
						});
					})();
				}

				flow.add(arr).run(function (err, result) {
	//
					expect(err).to.be.not.ok;
					expect(result).to.deep.equal(expected);	
					return done();
				});
			});

			it('should collect results with one argument.async', function (done) {

				var flow = zinc.create();

				var arr = [];
				var expected = [];

				for (var i = 0; i < 10; i++) {
					(function () {
						var index = i;
						expected.push(index);
						arr.push(function (h) {
							// ok, this time asynced
							setTimeout(function () {
								return h(null, index);
							}, 0);
						});
					})();
				}

				flow.add(arr).run(function (err, result) {
					//
					expect(err).to.be.not.ok;
					expect(result).to.deep.equal(expected);	
					return done();
				});
			});

			it('should collect results with multiple arguments', function (done) {

				var flow = zinc.create();

				var arr = [];
				var expected = [];

				for (var i = 0; i < 10; i++) {
					(function () {
						var index = i;
						expected.push([index, 'fnord' + index]);
						arr.push(function (h) {
							// ok, this time asynced
							return h(null, index, 'fnord' + index);
						});
					})();
				}

				flow.add(arr).run(function (err, result) {
					//
					expect(err).to.be.not.ok;
					expect(result).to.deep.equal(expected);	
					return done();
				});
			});

			it('should collect results with multiple arguments.async', function (done) {

				var flow = zinc.create();

				var arr = [];
				var expected = [];

				for (var i = 0; i < 10; i++) {
					(function () {
						var index = i;
						expected.push([index, 'fnord' + index]);
						arr.push(function (h) {
							// ok, this time asynced
							setTimeout(function () {
								return h(null, index, 'fnord' + index);
							}, 0);
						});
					})();
				}

				flow.add(arr).run(function (err, result) {
	//
					expect(err).to.be.not.ok;
					expect(result).to.deep.equal(expected);	
					return done();
				});
			});

		});

	});

	describe('chaining', function () {
		it('should use runner as a parameter for add', function (done) {

			var innerChild = zinc.create();

			innerChild.add(function (next) {
				return next(null, 'innerChild0');
			});

			var child = zinc.create();

			child.add(function (h) {
				r.push('child0');
				return h(null, 'child0');
			});

			child.add(innerChild);

			child.add(function (h) {
				r.push('child1');
				return h(null, 'child1');
			});

			var r = [];


			var flow = zinc.create();

			flow.add(function (h) {
				r.push('parent0');
				return h(null, 'parent0');
			});

			flow.add(child);

			flow.add(function (h) {
				r.push('parent1');
				return h(null, 'parent1');
			});

			flow.run(function (err, result) {
				expect(err).to.be.not.ok;

				expect(r).to.be.deep.equal([ 'parent0', 'child0', 'child1', 'parent1' ]);
				expect(result).to.be.deep.equal([ 'parent0', [ 'child0', 'child1' ], 'parent1' ]);

				return done();
			});

		});
	});

	return;


	describe('errors', function () {
		it('shuld break if function is not array, flow or function', function () {
			var flow = zinc.create();

			expect(function () {
				flow.add(null);
			}).throws();

			expect(function () {
				flow.add(123);
			}).throws();

			expect(function () {
				flow.add('23424');
			}).throws();

			expect(function () {
				flow.add(true);
			}).throws();

			expect(function () {
				flow.add({});
			}).throws();

			expect(function () {
				flow.add(function () {});
			}).not.to.throws();

			expect(function () {
				flow.add([function () {}]);
			}).not.to.throws();

			expect(function () {
				flow.add(zinc.create());
			}).not.to.throws();

		});
	});


	describe('global', function () {


		it('should run without callback', function (done) {
			var flow = zinc.create();

			flow.add(function (h) {
				return done();
			});

			flow.run();
		});

		it('should run without functions', function (done) {
			var flow = zinc.create();

			flow.run(function () {
				return done();
			});

		});
		

		it('should use context', function (done) {
			var flow = zinc.create();

			var obj = {};

			var result = [];
			var expected = [ obj, obj, obj ];

			var arr = [
				function (h) {
					result.push(this);
					return h();
				},
				function (h) {
					result.push(this);
					setTimeout(function () {
						return h();
					}, 0);
				},

				function (h) {
					result.push(this);
					return h();
				}
			];

			flow.context(obj);

			flow.add(arr);
			
			flow.run(function () {
				expect(result).to.deep.equal(expected);
				return done();
			});
		});

		it('should create new empty context for every run', function (done) {

			// getting global
			var scope = (function () {
				return this;
			})();

			var flow = zinc.create();

			var result = [];

			flow.add([
				function (h) {
					result.push(this);
					return h();
				},

				function (h) {
					result.push(this);
					setTimeout(function () {
						return h();
					}, 0);
				},

				function (h) {
					result.push(this);
					return h();
				}
			]);

			flow.run(function () {


				expect(result[0]).to.equal(result[1]);
				expect(result[1]).to.equal(result[2]);

				expect(result[0] != scope).to.be.ok;
				// this version gives very weired result in node
				// expect(result[0]).to.not.equal(scope);

				return done();
			});
		});

		it('should throw when executing multiple handlers', function (done) {
			var flow = zinc.create();

			var obj = {};

			flow.add(function (h) {
				setTimeout(function () {
					expect(function () {
						return h();
					}).throws();
				}, 0);

				return h();
			});
			
			flow.run(function () {
				return done();
			});

		});

		it('should run in mixed synced and asynced', function (done) {

			var flow = zinc.create();

			var arr = [];

			for (var i = 0; i < 100; i++) {
				(function () {
					var index = i;
					arr.push(function (h) {
						if (index % 2 === 0) {
							return h(null, index);
						} else {
							// ok, this time asynced
							process.nextTick(function () {
								return h(null, index);
							});
						}
					});
				})();
			}

			flow.add(arr).run(function () {
				return done();
			});
		});

		it('should run finalCallback in the same scope', function (done) {
			var flow = zinc.create();

			var obj = {};

			flow.add(function (h) {
				return h();
			});

			flow.context(obj);
			
			flow.run(function () {
				expect(this).to.equal(obj);
				return done();
			});
		});

		it('should run finalCallback in the same scope when error', function (done) {
			var flow = zinc.create();

			var obj = {};

			flow.context(obj);

			flow.add(function (h) {
				var x = s;
				return h();
			});
			
			flow.run(function () {
				expect(this).to.equal(obj);
				return done();
			});
		});
	});

	describe('asynchronous', function () {

		it('should run asynced code', function (done) {

			var flow = zinc.create();

			var arr = [];
			var result = [];
			var expected = [];

			for (var i = 0; i < 10; i++) {
				expected.push(i);
				(function () {
					var index = i;
					arr.push(function (h) {
						// ok, this time asynced
						setTimeout(function () {
							result.push(index);
							return h();
						}, 0);
					});
				})();
			}

			flow.add(arr).run(function (err) {
//
				expect(err).to.be.not.ok;
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		describe('waterfall', function () {


			it('should be chained into another flow as waterfall and have one argument', function (done) {
				var parent = zinc.create();

				var child = zinc
					.create()
					.waterfall();

				child.add(function (h) {
					setTimeout(function () {
						return h(null, 'child');
					}, 0);
				});

				parent.add(function (h) {
					setTimeout(function () {
						return h(null, 'one-one');
					}, 0);
				});

				parent.add(child);

				parent.add(function (h) {
					setTimeout(function () {
						return h(null, 'two-one');
					}, 0);
				});


				parent.run(function (err, result) {
					// result is now [ 'child', 'two-one' ]
					
					expect(err).to.be.not.ok;
					expect(result).to.be.deep.equal(['one-one', 'child', 'two-one']);

					return done();
				});
			});

			it('should be chained into another flow as waterfall and have multiple arguments', function (done) {
				var parent = zinc.create();

				var child = zinc
					.create()
					.waterfall();

				child.add(function (h) {
					setTimeout(function () {
						return h(null, 'child-one', 'child-two');
					}, 0);
				});

				parent.add(child);

				parent.add(function (h) {
					setTimeout(function () {
						return h(null, 'two-one');
					}, 0);
				});

				parent.run(function (err, result) {
					// result is now [ ['child-one', 'child-two'], 'two-one' ]
					
					expect(err).to.be.not.ok;
					expect(result).to.be.deep.equal([['child-one', 'child-two'], 'two-one']);

					return done();
				});
			});

			it('should be chained into another waterfall flow as waterfall and have multiple arguments', function (done) {
				var parent = zinc
					.create()
					.waterfall();

				var child = zinc
					.create()
					.waterfall();

				var results = [];

				parent.add(function (h) {
					setTimeout(function () {
						// this won't pass it to the child, since child has no
						// input
						return h(null, 'zork');
					});
				});

				child.add(function (h) {
					setTimeout(function () {
						return h(null, 'child-one', 'child-two');
					}, 0);
				});

				parent.add(child);

				parent.add(function (childResult, h) {
					setTimeout(function () {
						return h(null, 'two-one');
					}, 0);
				});

				parent.run(function (err, result) {
					// result is now [ ['child-one', 'child-two'], 'two-one' ]
					
					expect(err).to.be.not.ok;

					return done();
				});
			});
		});



		it('should stop execute when error is passed', function (done){
			var flow = zinc.create();

			var result = [];
			var error = new Error();
			var arr = [
				function (h) {
					result.push(0);
					setTimeout(function () {
						return h();
					},0);
				},

				function (h) {
					result.push(1);
					setTimeout(function () {
						return h(error);
					},0);
				},

				function (h) {
					result.push(2);
					setTimeout(function () {
						return h();
					},0);
				}
			];

			var expected = [0, 1];


			flow.add(arr).run(function (err) {
//
				expect(err).to.be.equal(error);
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

	});

	describe('synchronous', function () {
		describe('waterfall', function () {



			it('should be chained into another flow as waterfall and have one argument', function (done) {
				var parent = zinc.create();

				var child = zinc
					.create()
					.waterfall();

				child.add(function (h) {
					return h(null, 'child');
				});

				parent.add(function (h) {
					return h(null, 'one-one');
				});

				parent.add(child);

				parent.add(function (h) {
					return h(null, 'two-one');
				});


				parent.run(function (err, result) {
					// result is now [ 'child', 'two-one' ]
					
					expect(err).to.be.not.ok;
					expect(result).to.be.deep.equal(['one-one', 'child', 'two-one']);

					return done();
				});
			});

			it('should be chained into another flow as waterfall and have multiple arguments', function (done) {
				var parent = zinc.create();

				var child = zinc
					.create()
					.waterfall();

				child.add(function (h) {
					return h(null, 'child-one', 'child-two');
				});

				parent.add(child);

				parent.add(function (h) {
					return h(null, 'two-one');
				});

				parent.run(function (err, result) {
					// result is now [ ['child-one', 'child-two'], 'two-one' ]
					
					expect(err).to.be.not.ok;
					expect(result).to.be.deep.equal([['child-one', 'child-two'], 'two-one']);

					return done();
				});
			});
		});
		
		it('should not show error with maximum flow size when doing synced', function (done) {
			var flow = zinc.create();

			var arr = [];

			for (var i = 0; i < 10000; i++) {
				(function () {
					arr.push(function (h) {
						return h();
					});
				})();
			}

			flow.add(arr).run(function (err) {
//			async.series(arr, function () {
				return done();
			});
		});

		it('should run synced code', function (done) {

			var flow = zinc.create();

			var arr = [];
			var result = [];
			var expected = [];

			for (var i = 0; i < 10; i++) {
				expected.push(i);
				(function () {
					var index = i;
					arr.push(function (h) {
						result.push(index);
						return h();
					});
				})();
			}

			flow.add(arr).run(function (err) {
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		it('should stop execute when error is passed', function (done){
			var flow = zinc.create();

			var result = [];
			var error = new Error();
			var arr = [
				function (h) {
					result.push(0);
					return h();
				},

				function (h) {
					result.push(1);
					return h(error);
				},

				function (h) {
					result.push(2);
					return h();
				}
			];

			var expected = [0, 1];

			flow.add(arr).run(function (err) {
//
				expect(err).to.be.equal(error);
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		it('should stop executing when item has error', function (done) {
			var flow = zinc.create();
			var result = [];
			var arr = [
				function (h) {
					result.push(0);
					return h();
				},

				function (h) {
					result1.push(1);
					return h();
				},

				function (h) {
					result.push(2);
					return h();
				}
			];

			var expected = [0];

			flow.add(arr).run(function (err) {
//
				expect(err.message).to.contain('result1');
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		it('should run finalCallback in the same scope', function (done) {

			var obj = {};

			var flow = zinc.create();
			flow.context(obj);

			flow.add(function (h) {
				setTimeout(function () {
					return h();
				}, 0);
			});

			
			flow.run(function () {
				expect(this).to.equal(obj);
				return done();
			});
		});

		it('should run finalCallback in the same scope when error', function (done) {

			var obj = {};

			var flow = zinc.create();
			flow.context(obj);

			flow.add(function (h) {
				setTimeout(function () {
					return h(new Error());
				}, 0);
			});
			
			flow.run(function () {
				expect(this).to.equal(obj);
				return done();
			});
		});

	});
});
