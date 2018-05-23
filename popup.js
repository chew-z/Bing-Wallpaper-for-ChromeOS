function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

function Notify() {
    chrome.notifications.clear("bingwall", function() {});
    chrome.notifications.create("bingwall", {type: 'basic', iconUrl: 'icons/128.png', title: "Bing Background Wallpaper", message: "Wallpaper refreshed ..."},function() {});
}

function Download() {
    console.log("Bing Wallpaper refresh starting ...");
    document.querySelector('#wallpaper-copy').innerText = "wait ...";
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4) {
            if (httpRequest.status === 200) {
                data = this.response;
                url = data.images[0].url;
                copy = data.images[0].copyright;
                if(url) {
                    chrome.wallpaper.setWallpaper(
                        {
                            'url': 'https://www.bing.com'+ url,
                            'layout': 'CENTER',
                            'filename': 'bing_wallpaper',
                            'thumbnail': true
                        }, function(thumbnail) {
                            let thumbnail_data = _arrayBufferToBase64(thumbnail);
                            document.querySelector('#wallpaper-url').href = "https://www.bing.com" + url;
                            document.querySelector('#wallpaper-copy').innerText = "Downloaded: " + copy;
                            document.querySelector('#wallpaper-thumbnail').src = "data:image/jpeg;base64, " + thumbnail_data;
                            // console.log("Looks like Bing Wallpaper has been refreshed OK");
                            // Notify();
                        });
                }
            } else {
                console.log("Something went wrong. Are you connected to internet?");
            }
        }
    };
    httpRequest.open('GET', 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1');
    httpRequest.responseType = 'json';
    httpRequest.send();
}

// var target = document.querySelector('#reload');
// target.addEventListener('click', reload, false);

document.addEventListener('DOMContentLoaded', () => {
    Download();
});
