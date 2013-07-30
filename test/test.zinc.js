/*jshint indent:4, node:true, strict:false*/
/*global describe:true, expect:true, it:true */

// var zinc = require('../lib/zinc');
var expect = chai.expect;

describe('Test Async Zinc', function () {
	
	describe('global', function () {

		it('should run without callback', function (done) {
			var stack = zinc.create();

			stack.add(function (h) {
				return done();
			});

			stack.run();
		});


		
		it('should add object and method name', function (done) {

			var stack = zinc.create();
			var r = [];

			var obj = {
				one: function (h) { r.push('one'); return h(); },
				two: function (h) { r.push('two'); return h(); },
				three: function (h) { r.push('three'); return h(); },
				doit: function () {

					stack.add(this, 'one');
					stack.add(this, 'two');
					stack.add(this, 'three');

					stack.run(done);
				}
			};

			obj.doit();

		});

		it('should', function (done) {
			var stack = zinc.create();

			stack.run(function () {
				return done();
			});

		});
		
		it('should use runner as a parameter for add', function (done) {

			var child = zinc.create();

			child.add(function (h) {
				r.push('child0');
				return h(null, 'child0');
			});

			child.add(function (h) {
				r.push('child1');
				return h(null, 'child1');
			});

			var r = [];


			var stack = zinc.create();

			stack.add(function (h) {
				r.push('parent0');
				return h(null, 'parent0');
			});

			stack.add(child);

			stack.add(function (h) {
				r.push('parent1');
				return h(null, 'parent1');
			});

			stack.run(function (err, result) {
				expect(err).to.be.not.ok;

				expect(r).to.be.deep.equal([ 'parent0', 'child0', 'child1', 'parent1' ]);
				expect(result).to.be.deep.equal([ 'parent0', [ 'child0', 'child1' ], 'parent1' ]);

				return done();
			});

		});

		it('should use context', function (done) {
			var stack = zinc.create();

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

			stack.context(obj);

			stack.add(arr);
			
			stack.run(function () {
				expect(result).to.deep.equal(expected);
				return done();
			});
		});

		it('should not execute multiple handlers', function (done) {
			var stack = zinc.create();

			var obj = {};

			stack.add(function (h) {
				h();
				setTimeout(function () {
					return h();
				}, 0);
			});
			
			stack.run(function () {
				return done();
			});

		});

		it('should run in mixed synced and asynced', function (done) {

			var stack = zinc.create();

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

			stack.add(arr).run(function () {
				return done();
			});
		});

		it('should run finalCallback in the same scope', function (done) {
			var stack = zinc.create();

			var obj = {};

			stack.add(function (h) {
				return h();
			});

			stack.context(obj);
			
			stack.run(function () {
				expect(this).to.equal(obj);
				return done();
			});
		});

		it('should run finalCallback in the same scope when error', function (done) {
			var stack = zinc.create();

			var obj = {};

			stack.context(obj);

			stack.add(function (h) {
				var x = s;
				return h();
			});
			
			stack.run(function () {
				expect(this).to.equal(obj);
				return done();
			});
		});
	});

	describe('asynchronous', function () {

		it('should run asynced code', function (done) {

			var stack = zinc.create();

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

			stack.add(arr).run(function (err) {
//
				expect(err).to.be.not.ok;
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		describe('waterfall', function () {

			it('should pass multiple arguments to the final-callback', function (done) {
				var stack = zinc
					.create()
					.waterfall();

				var results = [];
				
				stack.push(function (h) {
					setTimeout(function () {
						return h(null, 'one-one', 'one-two');
					}, 0);
				});

				stack.push(function (argOne, argTwo, h) {
					results.push([ argOne, argTwo ]);
					setTimeout(function () {
						return h(null, 'two-one', 'two-two');
					}, 0);
				});

				stack.run(function (err, result) {
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

			it('should pass one argument to the final-callback', function (done) {
				var stack = zinc
					.create()
					.waterfall();

				stack.push(function (h) {
					setTimeout(function () {
						return h();
					}, 0);
				});

				stack.push(function (h) {
					setTimeout(function () {
						return h(null, 'two-one');
					}, 0);
				});

				stack.run(function (err, result) {
					// result is now 'two-one'
					
					expect(err).to.be.not.ok;
					expect(result).to.be.deep.equal('two-one');

					return done();
				});
			});

			it('should be chained into another stack as waterfall and have one argument', function (done) {
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

			it('should be chained into another stack as waterfall and have multiple arguments', function (done) {
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

			it('should be chained into another waterfall stack as waterfall and have multiple arguments', function (done) {
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

				parent.add(function (childOne, childTwo, h) {
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

		it('should collect results with one argument', function (done) {

			var stack = zinc.create();

			var arr = [];
			var expected = [];

			for (var i = 0; i < 10; i++) {
				expected.push(i);
				(function () {
					var index = i;
					arr.push(function (h) {
						// ok, this time asynced
						setTimeout(function () {
							return h(null, index);
						}, 0);
					});
				})();
			}

			stack.add(arr).run(function (err, result) {
//
				expect(err).to.be.not.ok;
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		it('should collect results with multiple arguments', function (done) {

			var stack = zinc.create();

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

			stack.add(arr).run(function (err, result) {
//
				expect(err).to.be.not.ok;
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		it('should stop execute when error is passed', function (done){
			var stack = zinc.create();

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


			stack.add(arr).run(function (err) {
//
				expect(err).to.be.equal(error);
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});
	});

	describe('synchronous', function () {
		describe('waterfall', function () {

			it('should pass multiple arguments to the final-callback', function (done) {
				var stack = zinc
					.create()
					.waterfall();

				var results = [];
				
				stack.push(function (h) {
					return h(null, 'one-one', 'one-two');
				});

				stack.push(function (argOne, argTwo, h) {
					results.push([ argOne, argTwo ]);
					return h(null, 'two-one', 'two-two');
				});

				stack.run(function (err, result) {
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

			it('should pass one argument to the final-callback', function (done) {
				var stack = zinc
					.create()
					.waterfall();

				stack.push(function (h) {
					return h();
				});

				stack.push(function (h) {
					return h(null, 'two-one');
				});

				stack.run(function (err, result) {
					// result is now 'two-one'
					
					expect(err).to.be.not.ok;
					expect(result).to.be.deep.equal('two-one');

					return done();
				});
			});

			it('should be chained into another stack as waterfall and have one argument', function (done) {
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

			it('should be chained into another stack as waterfall and have multiple arguments', function (done) {
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
		
		it('should not show error with maximum stack size when doing synced', function (done) {
			var stack = zinc.create();

			var arr = [];

			for (var i = 0; i < 10000; i++) {
				(function () {
					arr.push(function (h) {
						return h();
					});
				})();
			}

			stack.add(arr).run(function (err) {
//			async.series(arr, function () {
				return done();
			});
		});

		it('should run synced code', function (done) {

			var stack = zinc.create();

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

			stack.add(arr).run(function (err) {
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		it('should collect results with one argument', function (done) {

			var stack = zinc.create();

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

			stack.add(arr).run(function (err, result) {
//
				expect(err).to.be.not.ok;
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		it('should collect results with multiple arguments', function (done) {

			var stack = zinc.create();

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

			stack.add(arr).run(function (err, result) {
//
				expect(err).to.be.not.ok;
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		it('should stop execute when error is passed', function (done){
			var stack = zinc.create();

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

			stack.add(arr).run(function (err) {
//
				expect(err).to.be.equal(error);
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		it('should stop executing when item has error', function (done) {
			var stack = zinc.create();
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

			stack.add(arr).run(function (err) {
//
				expect(err.message).to.contain('result1');
				expect(result).to.deep.equal(expected);	
				return done();
			});
		});

		it('should run finalCallback in the same scope', function (done) {

			var obj = {};

			var stack = zinc.create();
			stack.context(obj);

			stack.add(function (h) {
				setTimeout(function () {
					return h();
				}, 0);
			});

			
			stack.run(function () {
				expect(this).to.equal(obj);
				return done();
			});
		});

		it('should run finalCallback in the same scope when error', function (done) {

			var obj = {};

			var stack = zinc.create();
			stack.context(obj);

			stack.add(function (h) {
				setTimeout(function () {
					return h(new Error());
				}, 0);
			});
			
			stack.run(function () {
				expect(this).to.equal(obj);
				return done();
			});
		});

	});
});
