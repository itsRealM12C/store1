

var StoreLastPage = new function() {
	this.get = function(callBack) {
		var param = {query : {select : ['lastPageInfo'], from : 'com.webos.app.discovery.lastPage:1'}};
		var bridge = new PalmServiceBridge();
		bridge.onservicecallback = callBack;
		bridge.call("luna://com.palm.tempdb/find", JSON.stringify(param));
	}
	, this.getCallBack = function(responseStr) {
		var responseObj = JSON.parse(responseStr);
		if( responseObj && responseObj.returnValue === true ) {
			var results = responseObj.results;
			if( results && results.length > 0 ) {
				var lastPageInfo = results[0].lastPageInfo;
				console.log('lastPageInfo', lastPageInfo);
				window.lastPageInfo = lastPageInfo;
				localStorage.setItem("lastPageInfo", lastPageInfo);
			}
		} else {
			console.error('no data');
		}

		return true;
	}
};

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


var Loader = new function() {
	this.host = "";
	this.q = {};
	this.channel = {};

	this.loadDeviceInfo = function(callback) {
	  var retry = 0;
		var interval = setInterval(
		function () {
			retry += 1;
			if(retry > 5) {
				clearInterval(interval);
				console.log("Retry Count :" + retry + " [X]");
				callback(JSON.stringify({}));
				return
			}
			var bridge = new PalmServiceBridge();
			bridge.onservicecallback = function(response) {
				console.log("try :" + retry + "[back]");
				clearInterval(interval);
				if(response){
				  callback(response);
				}else{
				  callback(JSON.stringify({}));
				    }
			};
			bridge.call("luna://com.webos.service.sdx/getHttpHeaderForServiceRequest", JSON.stringify({}));
			console.log("try :" + retry + "[call]");
		}
		,1000
		);
	};

	this.loadDeviceInfoCallback = function(response) {
		response = JSON.parse(response);
		Loader.host = "lgrecommends.lgappstv.com/discovery_2019/discovery.html";
		Loader.q = response;

		if(Loader.q.returnValue === true) {
			if(Loader.q.header) Loader.q.header = "";
			Loader.host = Loader.q.HOST.split(".")[0] + "." + Loader.host;
		}

		return true;
	}
	
	this.loadChannelSetting = function(callback) {
		var bridge = new PalmServiceBridge();

		bridge.onservicecallback = function(response) {
			callback(response);
		};

		bridge.call("luna://com.webos.service.iepg/getChannelList", '{"type":0,"sort":0,"channelGroup":["All"]}');
	};

	this.loadChannelSettingCallback = function(response) {
		response = JSON.parse(response);

		if(response.returnValue === true) {
			response["channelList"] = [];
		}

		Loader.channel = response;

		return true;
	};

	this.isNetworkConnected = function (callback) {
    var retry = 0;
		var interval = setInterval(
		function () {
			retry += 1;
			if(retry > 5) {
				clearInterval(interval);
				console.log("Retry Count :" + retry + " [X]");
				window.location = "./html/network_error.html";
				return
			}
			var bridge = new PalmServiceBridge();
			bridge.onservicecallback = function(response) {
				console.log("try :" + retry + "[back]");
				clearInterval(interval);
				if(response){
				  callback(response);
				}else{
				  window.location = "./html/network_error.html";
				  }
			};
			bridge.call("luna://com.palm.connectionmanager/getstatus", '{}');
			console.log("try :" + retry + "[call]");
		}
		,1000
		);
	};
}

Loader.isNetworkConnected(function(response) {
	response = JSON.parse(response);	
	if(response.returnValue && response.isInternetConnectionAvailable) {
		var sync = new Sync();

		sync.setCallback(function() {
			console.log("FINISHED");
			console.log(Loader.host);
			console.log(Loader.q);

			//window.location = "http://" + Loader.host + "?q=" + encodeURIComponent(JSON.stringify(Loader.q));
			//
			delete Loader.q['X-Authentication'];
			delete Loader.q['X-Device-ID'];
			delete Loader.q['X-Login-Session'];
			delete Loader.q['cookie'];

			document.sendform.action = "https://"+Loader.host;
			document.sendform.q.value = JSON.stringify(Loader.q);
			if (PalmSystem && JSON.parse(PalmSystem.launchParams || '{"query": "featured"}').query == "featured") {
				if( window.lastPageInfo ) {
					document.sendform.fast.value = "false";
				} else {
					document.sendform.fast.value = "true";
				}
			}
		
			document.sendform.submit();
		});

		sync.add(Loader.loadDeviceInfo, Loader.loadDeviceInfoCallback);
		sync.add(StoreLastPage.get, StoreLastPage.getCallBack);
		//sync.add(Loader.loadChannelSetting, Loader.loadChannelSettingCallback);

		sync.run();
	} else {
		window.location = "./html/network_error.html";
	}
});


(function() {
    //document.body.style.background = "#080808 url(file:///mnt/otncabi/usr/palm/applications/com.webos.app.discovery/lgstore_splash.png) center top no-repeat";
    
    var storeForm = document.createElement("FORM");
    storeForm.name = "sendform";
    storeForm.method = "GET";
    storeForm.action = "";

    var storeInput1 = document.createElement("INPUT");
    storeInput1.type = "HIDDEN";
    storeInput1.name = "q";
    storeInput1.value= "{}";

    storeForm.appendChild(storeInput1);

    var storeInput2 = document.createElement("INPUT");
    storeInput2.type = "HIDDEN";
    storeInput2.name = "page";
    storeInput2.value= "store";

    storeForm.appendChild(storeInput2);

		var storeInput3 = document.createElement("INPUT");
		storeInput3.type = "HIDDEN";
		storeInput3.name = "fast";
		storeInput3.value= "false";

		storeForm.appendChild(storeInput3);

    document.body.appendChild(storeForm);
})();
