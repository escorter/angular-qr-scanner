(function () {
  'use strict';

  angular.module('qrScanner', ["ng"]).directive('qrScanner', ['$interval', '$window', function ($interval, $window) {
    return {
      restrict: 'E',
      scope: {
        ngSuccess: '&ngSuccess',
        ngError: '&ngError',
        ngVideoError: '&ngVideoError'
      },
      link: function (scope, element, attrs) {

        window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

        var height = attrs.height || 300;
        var width = attrs.width || 250;
        var showDeviceList = attrs.showdevicelist !== undefined;

        var video = $window.document.createElement('video');
        video.setAttribute('width', width);
        video.setAttribute('height', height);
        angular.element(element).append(video);
        //video.setAttribute('style', '-moz-transform:rotateY(-180deg);-webkit-transform:rotateY(-180deg);transform:rotateY(-180deg);');
        var canvas = $window.document.createElement('canvas');
        canvas.setAttribute('id', 'qr-canvas');
        canvas.setAttribute('width', video.clientWidth);
        canvas.setAttribute('height', video.clientHeight);
        canvas.setAttribute('style', 'display:none;');
        angular.element(element).append(canvas);

        var context = canvas.getContext('2d');
        var stopScan;
        var videoSelect;

        var scan = function () {
          if ($window.localMediaStream) {
            context.drawImage(video, 0, 0, 307, 250);
            try {
              qrcode.decode();
            } catch (e) {
              scope.ngError({ error: e });
            }
          }
        };

        var successCallback = function (stream) {
          video.srcObject = stream;
          $window.localMediaStream = stream;

          scope.video = video;
          video.play();
          stopScan = $interval(scan, 500);
        };

        var gotDevices = function (deviceInfos) {

          if(!showDeviceList) {
            return;
          }

          videoSelect = $window.document.createElement('select');
          videoSelect.setAttribute('class', 'form-control');

          for (var i = 0; i !== deviceInfos.length; ++i) {
            var deviceInfo = deviceInfos[i];
            var option = document.createElement('option');
            option.value = deviceInfo.deviceId;
            if (deviceInfo.kind === 'videoinput') {
              option.text = deviceInfo.label || 'Camera ' + (videoSelect.length + 1);
              videoSelect.append(option);
            }
          }

          videoSelect.onchange = function () {
            refreshStream();
          };

          angular.element(element).prepend(videoSelect);
        };

        var refreshStream = function () {
          destroy();
          init();
        };

        var destroy = function () {
          if ($window.localMediaStream) {
            $window.localMediaStream.getTracks().forEach(function (track) {
              track.stop();
            });
          }
          if (stopScan) {
            $interval.cancel(stopScan);
          }
        };

        var init = function () {
          // Call the getUserMedia method with our callback functions
          if (navigator.getUserMedia) {
            var videoSource = videoSelect ? videoSelect.value : undefined;
            var constraints = {
              video: {
                facingMode: "environment",
                deviceId: videoSource ? {exact: videoSource} : undefined
              }
            };
            navigator.mediaDevices.getUserMedia(constraints)
              .then(successCallback)
              .catch(function (e) {
                scope.ngVideoError({ error: e });
              });
            qrcode.callback = function (data) {
              scope.ngSuccess({ data: data });
            };

          } else {
            scope.ngVideoError({ error: 'Native web camera streaming (getUserMedia) not supported in this browser.' });
          }
        };

        var start = function () {
          navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(function () {
            scope.ngVideoError({ error: 'Native web camera streaming (getUserMedia) not supported in this browser.' });
          });
          init();
          element.bind('$destroy', destroy);
        };

        start();
      }
    }
  }]);
})();
