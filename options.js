// options.js
// @flow
// @flow-NotIssue
"use strict"


var background = chrome.extension.getBackgroundPage();

/* list all background variables and their values */
function _inspect_background() {
    console.log("background: " + Object.prototype.toString.call(background));
    for(let b in background) {
        if(window.hasOwnProperty(b)) console.log(b);
    }
}

function response(e) {
    var urlCreator = window.URL || window.webkitURL;
    var imageUrl = urlCreator.createObjectURL(this.response);
    document.querySelector("#image").src = imageUrl;
}

function addImage(fp) {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () { 
        if (this.readyState == 4) { 
            let urlCreator = window.URL || window.webkitURL;
            let imageUrl = urlCreator.createObjectURL(this.response);
            let filenames = document.getElementById("filenames");
            let div = document.createElement("div");
            div.class = "column column-80";
            let image = document.createElement("img");
            image.src = imageUrl;
            div.appendChild(image);
            filenames.appendChild(div);
        } 
    }
    xhr.open('GET', "file://" + fp);
    xhr.responseType = 'blob';
    xhr.send();
}

function addFilename(fp) {
    let filenames = document.getElementById("filenames");
    let filename = document.createElement("div");
    filename.innerHTML = '<p>' + fp + '</p>';
    filenames.appendChild(filename);
}

document.addEventListener('DOMContentLoaded', () => {
    let refreshInterval = document.getElementById("refreshInterval");
    let selectPosition = document.getElementById("selectPosition");

    refreshInterval.value = background.refresh_interval;
    selectPosition.value = background.wallpaper_position;
    let wallpapers = background.WallpapersList;
    console.log('wallpapers ' + wallpapers);

    refreshInterval.addEventListener("input", () => {
        chrome.storage.sync.set({ "refresh_interval": refreshInterval.value } );
    });
    selectPosition.addEventListener("change", () => {
        chrome.storage.sync.set({ "wallpaper_position": selectPosition.value } );
    });
    if (wallpapers.length > 0 ) {
        chrome.downloads.search({query: ["Media/Pictures/Bing"], limit: 8}, function(data) {
            data.forEach(function(item) {
                addFilename( item.filename);
                addImage( item.filename);
            });
        });
    }

});
