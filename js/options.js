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

function pathToName(fp) {
    let name = fp.substring(fp.lastIndexOf("/") + 1);
    name = name.substring(0, name.indexOf("_"));
    name = name.split(/(?=[A-Z])/).join(" ");
    return name;
}

function odd(i) {
    if(i & 1) 
        return true
    else
        return false
}


function uniqWallpapers(a) {
    // Because Chrome brogrammers are dumb and chrome.downloads.search returns duplicates
    // https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
    // adjusted for our needs (unique filepath)
    let seen = {};
    return a.filter( (item) => {
        return seen.hasOwnProperty(item.filename) ? false : (seen[item.filename] = true);
    });
}


function addImage(fp, elem) {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () { 
        if (this.readyState == 4) { 
            let urlCreator = window.URL || window.webkitURL;
            let imageUrl = urlCreator.createObjectURL(this.response);
            elem.src = imageUrl;
        } 
    }
    xhr.open('GET', "file://" + fp);
    xhr.responseType = 'blob';
    xhr.send();
}


function addImages(imgs) {
    let max = imgs.length;
    let wallpapers = document.getElementById("wallpapers");
    let row;
    imgs.forEach( (img, i) => {
        // console.log('i = ' + i);
        if ( !odd(i) ) {
            row = document.createElement("div");
            row.className += "row";
        }
        let column = document.createElement("div");
        column.className += "col feature";
        column.innerHTML = '<p><a href=https://www.bing.com' + img + '>' + pathToName(img) + '</a></p>';
        let wallpaper_image = document.createElement("img");
        wallpaper_image.className += "wallpaper";
        wallpaper_image.src = 'https://www.bing.com' + img;
        wallpaper_image.addEventListener('click', () => { 
            //to background.js
            chrome.runtime.sendMessage({
                "from": "options",
                "subject": "action",
                "action": "change_wallpaper",
                "url": 'https://www.bing.com' + img
            });
        });
        column.appendChild(wallpaper_image);
        row.appendChild(column);
        // every odd and last image - two images per row
        if ( odd(i) ) {
            wallpapers.appendChild(row);
        } else {
            if (i == max - 1)
                wallpapers.appendChild(row);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    let refreshInterval = document.getElementById("refreshInterval");
    let rotateInterval = document.getElementById("rotateInterval");
    let selectPosition = document.getElementById("selectPosition");

    refreshInterval.value = background.refresh_interval;
    rotateInterval.value = background.rotate_interval;
    selectPosition.value = background.wallpaper_position;
    let wpp = background.WallpapersList;

    // add listeners for options change
    refreshInterval.addEventListener("input", () => {
        chrome.storage.sync.set({ "refresh_interval": refreshInterval.value } );
    });
    rotateInterval.addEventListener("input", () => {
        chrome.storage.sync.set({ "rotate_interval": rotateInterval.value } );
    });
    selectPosition.addEventListener("change", () => {
        chrome.storage.sync.set({ "wallpaper_position": selectPosition.value } );
    });
    if(wpp.length)  { // not empty list
        console.log('Found ' + wpp.length + ' files');
        addImages(wpp);
    }

});
