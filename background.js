// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This event is fired each time the user updates the text in the omnibox,
// as long as the extension's keyword mode is still active.

var all_suggests = []

chrome.omnibox.onInputChanged.addListener(
  function(text, suggest) {
    log('inputChanged: ' + text, 0);
    var suggestions = []
    re = new RegExp('^' + text, "i");
    i = all_suggests.length;
    while (i--) {
        if (re.test(all_suggests[i].title)) {
            log('match: ' + all_suggests[i].title, 0);

            suggestions.push({"content": all_suggests[i].title, "description": all_suggests[i].title});
        }
    }
    suggest(suggestions);
  });

chrome.omnibox.onInputStarted.addListener(
  function() {
    dumpBookmarks()
    log('all_suggests: ' + String(all_suggests), 0);
  }
);  
  
// This event is fired with the user accepts the input in the omnibox.
chrome.omnibox.onInputEntered.addListener(
  function(text) {
    log('inputEntered: ' + text, 0);
    var thisTabUnused = true
    var re = new RegExp('^' + text, "i");
    var i = all_suggests.length;
    var found = false
    while (i--) {
        if (re.test(all_suggests[i].title)) {
            found = true
            log('open folder: ' + all_suggests[i].title, 0);
            chrome.bookmarks.getSubTree(all_suggests[i].id, function(bookmarkNodes) {
                var i;
                for (i = 0; i < bookmarkNodes.length; i++) {
                    var bookmarkNode = bookmarkNodes[i]
                    if (bookmarkNode.children && bookmarkNode.children.length > 0) {
                        var j;
                        for (j = 0; i < bookmarkNode.children.length; j++) {
                            if (bookmarkNode.children[j].url) {
                                log('open URL: ' + bookmarkNode.children[j].url, 0)
                                if (thisTabUnused){
                                    // first URL, so open that in this tab
                                    chrome.tabs.update({url: bookmarkNode.children[j].url});
                                    thisTabUnused = false
                                } else {
                                    // the rest of the URLs open in a new background tab
                                    chrome.tabs.create({url : bookmarkNode.children[j].url, active:false, selected:false})
                                }
                            } else {
                                log('not opening subfolder: ' + bookmarkNode.children[j].title, 0)
                            }
                        }
                    } else {
                        log('folder has no content: ' + bookmarkNode.title, 1);
                    }
                }
                
            });
        }
    }
    if (!found){
        alert('No folder which matched "' + text + '"!');
    }

    
  });
 
// Traverse the bookmark tree, and dump all folders
function dumpBookmarks() {
  var bookmarkTreeNodes = chrome.bookmarks.getTree(
    function(bookmarkTreeNodes) {
        // empty the suggestions, otherwise it gets added again!
        all_suggests = []
        dumpTreeNodes(bookmarkTreeNodes, all_suggests)
    });
}

function dumpTreeNodes(bookmarkNodes, ret) {
  var i;
  for (i = 0; i < bookmarkNodes.length; i++) {
    dumpNode(bookmarkNodes[i], ret);
  }
}

function dumpNode(bookmarkNode, ret) {
  // we only take nodes with children = folder into account
  if (bookmarkNode.children && bookmarkNode.children.length > 0) {
    ret.push({"title": bookmarkNode.title, "id": bookmarkNode.id});
    log('Added: ' + bookmarkNode.title, 0);
    dumpTreeNodes(bookmarkNode.children, ret);
  }
}

function log(msg, level){
    // 1 = info, 0 = debug
    if (level >= 1){
        console.log(msg);
    }
}

// from http://www.rajeshsegu.com/2012/07/js-pretty-print-an-object/
function prettyPrint(obj){
    var toString = Object.prototype.toString,
        newLine = "\n", space = " ", tab = 1,
        buffer = "",        
        indent = arguments[1] || 0,
        //Second argument is indent
        //For better performance, Cache indentStr for a given indent.
        indentStr = (function(n){
            var str = "";
            while(n--){
                str += space;
            }
            return str;
        })(indent); 
 
    if(!obj || ( typeof obj != "object" && typeof obj!= "function" )){
        //any non-object ( Boolean, String, Number), null, undefined, NaN
        buffer += obj;
    }else if(toString.call(obj) == "[object Date]"){
        buffer += "[Date] " + obj;
    }else if(toString.call(obj) == "[object RegExp"){
        buffer += "[RegExp] " + obj;
    }else if(toString.call(obj) == "[object Function]"){
        buffer += "[Function] " + obj;
    }else if(toString.call(obj) == "[object Array]"){
        var idx = 0, len = obj.length;
        buffer += "["+newLine;
        while(idx < len){
            buffer += [
                indentStr, idx, ": ", 
                prettyPrint(obj[idx], indent + tab)
            ].join("");
            buffer += "\n";
            idx++;
        }
        buffer += indentStr + "]";
    }else { //Handle Object
        var prop;
        buffer += "{"+newLine;
        for(prop in obj){
            buffer += [
                indentStr, prop, ": ", 
                prettyPrint(obj[prop], indent + tab)
            ].join("");
            buffer += newLine;
        }
        buffer += indentStr + "}";
    }
 
    return buffer;
}
