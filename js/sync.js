function Sync() {
	var funcs = [];
	var finished = [];
	
	var finalCallback = function() {};
	var isFinalCallbackCalled = false;

	var self = this;

	this.add = function(func, callback) {
		var generatedFunction = function(idx) {
			func(function(response) {
				finished[idx] = callback(response);
				self.finalize();
			});
		};

		funcs.push(generatedFunction);
		finished.push(false);
	};

	this.setCallback = function(callback) {
		finalCallback = callback;
	};

	this.run = function() {
		for(var i=0;i<funcs.length;++i) {
			funcs[i](i);
		}
	};

	this.finalize = function() {
		for(var i=0;i<finished.length;++i) {
			if(finished[i]===undefined) continue;
			if(!finished[i]) return;
		}

		if(isFinalCallbackCalled) return;
		isFinalCallbackCalled = true;
		finalCallback();
	};
}


