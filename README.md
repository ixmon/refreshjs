# refreshjs
### An unobtrusive, easy to install JS, CSS, and image reloader. 

RefreshJS is a simple javascript include to be added to the headers of html in your dev environment. Without any modifications to the backend, npm, bower, or clientside plugin installs it will give you an inline html nofication when javascript, css, or image resources change on the server. You can click Apply or Ignore to rerefresh the resources, in most situations without disturbing the state of the html. 

This is accomplished by performing lightweight HEAD requests on resources enumerated in the DOM. A hash is generated from the server responses, and when things change (whether it's E-Tags, Last Modified, or whatever) the signal is sent to the snippet in the client to reload. 

The preference to automatically apply changes can be stored in a cookie, or flushed by emptying the browser cache. The snippet doesn't visually change the page in any way and only adds about 12k to the payload pulled in by the browser. 

## Why is this useful?
If you use gulp or grunt or some other build pipeline, it doesn't take many additions to get your build time up to 10 seconds, or the point at which you can outrun the build and get back to the HTML window to hit CTRL+R -- at that point you may be wondering if you are looking at the change, if the change hasn't propagated, or wondering if the build died because of a syntax error. The automatic reloader is more than just a convenience to reload the page, it's more of an indicator letting you know to proceed with examining the change without wasting brainpower wondering if the change is there yet.

## Quickstart
If you don't intend to modify RefreshJS or do an development, the recommended way to install is to grab the compressed <a href='https://raw.githubusercontent.com/ixmon/refreshjs/master/dist/refresh.min.js'>refresh.min.js</a> from the <a href='https://github.com/ixmon/refreshjs/tree/master/dist'>dist/</a> directory. 

To include the snippet, simply add the following snippet anywhere in your html
```html
    <script src='/refresh.min.js' type='text/javascript'></script>
```
I would recommend only doing this in DEV however. You probably don't need notifications about code changes in production. 


For more information, please see <a href='http://refreshjs.com'>refreshjs.com</a>


## Extending
If you do want to view or modify the code, check out the entire repository, a gulpfile.js is included for building and all sources are in the <a href='https://github.com/ixmon/refreshjs/tree/master/src'>src/</a> directory.



