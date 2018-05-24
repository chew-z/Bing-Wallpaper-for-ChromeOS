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


document.addEventListener('DOMContentLoaded', () => {
    let refreshInterval = document.getElementById("refreshInterval");
    let selectPosition = document.getElementById("selectPosition");

    refreshInterval.value = background.refresh_interval;
    selectPosition.value = background.wallpaper_position;

    refreshInterval.addEventListener("input", () => {
        chrome.storage.sync.set({ "refresh_interval": refreshInterval.value } );
    });
    selectPosition.addEventListener("change", () => {
        chrome.storage.sync.set({ "wallpaper_position": selectPosition.value } );
    });
});
