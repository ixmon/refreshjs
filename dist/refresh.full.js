/**
 *  Object for converting string data to a short hash, similar to md5sum.
 */

var FlexDigest = {

    keyspace: 1000000000,
    sum:      0,
    hash:   function ( input ) {
      FlexDigest.sum = 0;
      input.toString().split( '' ).map( function ( character )  {
      FlexDigest.sum += character.charCodeAt( 0 );
      FlexDigest.sum = FlexDigest.sum % FlexDigest.keyspace;
    } );
    return FlexDigest.sum.toString( 36 );
   }

};

/**
 * RefreshJS clientside JS, CSS and image refresher.
 * http://github.com/ixmon/refreshjs
 * 
 */

var Refresh = {

  elements: [],
  stack: {},
  pollInterval: 3,
  urlTable: {},
  timeout: 1000,
  showingNotification: false,
  // mustMatch: /\/Your-App\//,
  mustMatch: /.*/,
  mustNotMatch: /refresh\.js/,
  debugLevel: 0,
  selfDestruct: false,
  webSocketUrl: 'ws://127.0.0.1:3001',
  socket: null,
  updateStrategy: 'polling',
  rldPrefs: '',
  formStates: '',
  init: function () {
    this.scanDOM();
    // this.websocketInit();
    setTimeout( Refresh.restoreState, 1000 );

    this.debug( 'update strategy is '+ this.updateStrategy, 1 );
      setTimeout( function() { Refresh.poll(); }, this.timeout );

  },
  debug: function ( str, level ) {
    if ( level <= this.debugLevel ) {
      console.log( str );
    }
  },
  jsCallback: function ( el ) {

    if ( Refresh.selfDestruct ) {
      return;
    }

    Refresh.lastCallback = function() { Refresh.jsCallback( el ); };
    Refresh.saveState();

    if ( ! Refresh.showNotification( el.src ) ) {
      return;
    }

    if ( this.updateStrategy === 'websocket' ) {

      document.location.href=document.location.href;
    }
    else {
      // polling introduces a race condition
      setTimeout ( function () {
        document.location.href=document.location.href;
      }, 1000 );
    }

    this.selfDestruct  = true;
  },

  imgCallback: function ( el ) {

    if ( this.selfDestruct ) {
      return;
    }

    el.src= this.uncacheUrl( el.src );
  },

  bgimgCallback: function ( el ) {

    if ( this.selfDestruct ) {
      return;
    }

    var image = el.style.backgroundImage;
    var matches = image.match( /url\('?"?([^"]+)'?"?\)/i );

    this.debug( 'parsed background image ' + matches[1], 2 );
    el.style.backgroundImage = 'url('+
        Refresh.uncacheUrl( matches[1] ) +')';

    el.src= Refresh.uncacheUrl( el.src );
  },

  cssCallback: function ( el ) {

    if ( this.selfDestruct ) {
      return;
    }

    Refresh.lastCallback = function() { Refresh.cssCallback( el ); };

    if ( ! Refresh.showNotification( el.href ) ) {
      return;
    }

    var newHref = Refresh.uncacheUrl( el.href );
    // el.setAttribute( 'href', '' );
    el.setAttribute( 'href', newHref );
  },

  scanDOM: function () {

    var elements = document.getElementsByTagName( '*' );

    for ( var i = 0; i < elements.length; i++ ) {
      var el = elements[ i ];

      if ( Refresh.skips( el ) ) {
        continue;
      }

      this.elements.push( el );
    }
  },

  websocketInit: function () {

    try {
      this.socket         = new WebSocket( this.webSocketUrl );

      this.socket.onerror = function( event ) {
        Refresh.debug( 'WebSocket Error: ' + event.data, 1 );
      };

      this.socket.onopen  = function( event ) {
        Refresh.debug( 'Connected to: ' +
            Refresh.webSocketUrl, 1 );
        Refresh.debug( event.data, 3 );
        Refresh.socket.send( new Date().getTime() );
      };

      this.socket.onclose = function( event ) {
        if ( Refresh.updateStrategy === 'websocket' ) {
          Refresh.debug( 'Disconnected from WebSocket', 1 );
          Refresh.debug( event.data, 3 );
          setTimeout( Refresh.init(), 3000 );
        }

      };

      this.socket.onmessage = function( event ) {
        Refresh.debug( 'WebSocket sent: ' + event.data, 1 );
        if ( event.data === 'ok' ) {
          Refresh.updateStrategy = 'websocket';
        }
        else if ( event.data === 'REFRESH_CSS' ) {

          Refresh.elements.map ( function ( el ) {
            if ( el.tagName === 'LINK' &&  el.href ) {
              Refresh.cssCallback( el );
            }
          } );

        }
        else if ( event.data === 'REFRESH_JS' ) {

          Refresh.elements.map ( function ( el ) {

            if ( el.tagName === 'SCRIPT' && el.src ) {
              Refresh.jsCallback( el );
            }
          } );
        }
        else {
          Refresh.debug( 'Unknown command from websocket:' +
            event.data );
        }

        Refresh.debug( 'update strategy is '+
            Refresh.updateStrategy, 1 );
      };

      window.onbeforeunload =  function( ){
        Refresh.socket.close();
      };
    }
    catch ( e ) {
      this.debug( 'Client can\'t use websockets ? ' +e.toString(), 1 );
      this.debug( 'update strategy is '+ this.updateStrategy, 1 );
      setTimeout( function() { Refresh.poll(); }, this.timeout );

    }

  },

/**
 * Produce a unique fresh URL to bypass the cache 
 * 
 */

  cacheUrl: function ( url ) {

  if ( ! url ) {
    return '';
  }

  url = url.replace( /\?refresh-js=(\d+)/, '' );
  url = url.replace( /&refresh-js=(\d+)/,  '' );
  url = url.replace( /refresh-js=(\d+)/,   '' );

  return url;
},


/**
 * Revert a unique cache bypass URL to it's original form.
 */

  uncacheUrl: function( url ) {

  if ( ! url ) {
    return '';
  }

  url = url.replace(/#/, '');

  var index=1;
  var matches = url.match( /refresh-js=(\d+)/ );

  if ( matches ) {
    index = matches[1];
    index++;
  }


  if ( url.search( /refresh-js=\d+/ ) > -1 ) {
    url = url.replace( /refresh-js=(\d+)/,
        'refresh-js='+index );
  }
  else if ( url.search( /\?/ ) > -1 ) {
    url = url +'&refresh-js='+index;
  }
  else {
    url = url +'?refresh-js='+index;
  }



  return url;
},

/**
 * Go through the stack and run callbacks after polling has detected changed
 * data.
 */

  work: function () {

    Refresh.debug( 'in work()', 1 );

    var callback = function( job, data ) {

      var hash = FlexDigest.hash( data );
      var originalUrl = Refresh.cacheUrl( job );

      if ( ! Refresh.urlTable[ originalUrl ] ) {
           Refresh.urlTable[ originalUrl ] = {};
      }

      Refresh.urlTable[ originalUrl ].hash     = hash;
      Refresh.urlTable[ originalUrl ].lastPoll =
        new Date().getTime() / 1000;

      if ( Refresh.urlTable[ originalUrl ].lastHash &&
          Refresh.urlTable[ originalUrl ].hash !==
          Refresh.urlTable[ originalUrl ].lastHash
         ) {

        Refresh.debug( 'should update '+originalUrl, 2 );
        Refresh.dump( Refresh.urlTable, 2 );

        if ( data.length < 1 ) {
          Refresh.debug(
            'data from '+originalUrl+' was null', 2 );
        }
        else if ( data.length < 500 ) {
          Refresh.debug( data, 3 );
        }

        var jobCallback = Refresh.stack[ originalUrl ].callback;
        jobCallback( Refresh.stack[ originalUrl ].el );
      }

      Refresh.urlTable[ originalUrl ].lastHash = hash;

    };

    for( var job in Refresh.stack ) {

      if ( ! job || ! Refresh.stack.hasOwnProperty( job ) ) {
        continue;
      }

      if ( ! Refresh.showingNotification ) {
      Refresh.xget( job, callback );
      }
    }

    if ( Refresh.updateStrategy === 'polling' ) {
      setTimeout( function() {
        Refresh.poll();
      }, Refresh.timeout );
    }
  },


/**
 * Walk the DOM, schedule selected items for polling.
 */

  poll: function () {
    Refresh.debug( 'in poll()', 1 );

    Refresh.elements.map( function ( el ) {

      Refresh.debug(
        el.tagName +' '+ el.getAttribute( 'type' ) +' '+
          el.getAttribute( 'src' ) +' '+ el.getAttribute( 'id' ), 3 );

      // js file
      if ( el.tagName === 'SCRIPT' && el.src ) {
        Refresh.trackUrl( el.src, el, Refresh.jsCallback );

        return;
      }

      // image
      if ( el.tagName === 'IMG' ) {
        Refresh.trackUrl( el.src, el, Refresh.imgCallback );
        return;
      }

      // bg image
      var image = el.style.backgroundImage;
      var matches = image.match( /url\('?"?([^"]+)'?"?\)/i );

      if ( 0 && matches ) {
        Refresh.trackUrl(
            matches[1], el, Refresh.bgimgCallback );
        return;
      }

      // css file
      if ( el.tagName === 'LINK' &&  el.href ) {
        Refresh.trackUrl(
            el.href, el, Refresh.cssCallback );
        return;

      }

    } );

    if ( Refresh.updateStrategy === 'polling' ) {
      setTimeout( function() {
        Refresh.work();
      }, Refresh.timeout );
    }

  },


/**
 * Perform an ajax HEAD or fallback to a GET to obtain the FlexDigest of a
 * resource.
 */

  xget: function ( url, callback, method ) {

    var now = new Date().getTime() / 1000;
    var originalUrl  = Refresh.cacheUrl( url );

    if ( ! method ) {
      method = 'HEAD';
    }

    if ( Refresh.urlTable[ originalUrl ] &&
        Refresh.urlTable[ originalUrl ].lastPoll &&
        ( Math.abs(
        Refresh.urlTable[ originalUrl ].lastPoll  - now )
          ) < Refresh.pollInterval
      ) {
      Refresh.debug(
          Math.abs(
            Refresh.urlTable[ originalUrl ].lastPoll  -
            now ),
            2
          );
      return;
    }


    var httpRequest = new XMLHttpRequest();

    try{
      // Opera 8.0+, Firefox, Chrome, Safari, IE 7+
      httpRequest = new XMLHttpRequest();
    }
    catch ( e ) {
      // Internet Explorer < 7
      try{
        httpRequest = new ActiveXObject( 'Msxml2.XMLHTTP' );
      }
      catch ( e ) {
        try{
          httpRequest = new ActiveXObject( 'Microsoft.XMLHTTP' );
        }
        catch ( e ){
          return false;
        }
      }
    }

    httpRequest.onreadystatechange  = function(){

      if ( httpRequest.readyState !== 4  ) {
        return;
      }

      if ( method === 'HEAD' ) {
        var hdrs = httpRequest.getResponseHeader( 'ETag' );
        hdrs += httpRequest.getResponseHeader( 'Last-Modified' );
        hdrs += httpRequest.getResponseHeader( 'Content-Length' );

        if ( hdrs === 0 ) {
          Refresh.xget( url, callback, 'GET' );
        }

        callback( url, hdrs );
      }
      else {
        callback( url, httpRequest.responseText );
      }

    };

    httpRequest.open( method, url, true );
    httpRequest.send();

  },


/**
 * Record the detected DOM elements in the stack.
 */

trackUrl: function ( url, el, callback ) {
  var originalUrl = Refresh.cacheUrl( url );

  if ( ! Refresh.stack[ originalUrl ] ) {
    Refresh.stack[ originalUrl ] = {};
  }

  Refresh.stack[ originalUrl ].next     =
    Refresh.uncacheUrl( url );
  Refresh.stack[ originalUrl ].el       = el;
  Refresh.stack[ originalUrl ].callback = callback;

},

/**
 *  Contains the logic for skipping or selecting a DOM element for monitoring.
 */

  skips: function ( el ) {

    var url = '';

    [ el.href, el.src ].map( function ( attribute ) {
      if ( !url && attribute ) {
        url = attribute.toString();
      }
    } );

    if ( ! url ) {
      return true;
    }

    if ( url.search( Refresh.mustMatch ) === -1 ||
       url.search( Refresh.mustNotMatch ) !== -1
    ) {
      return true;
    }

    return false;
  },


/**
 *  Iterate over every form's input field and apply a callback.
 */

  formIterator: function ( callback ) {

    var elements = document.getElementsByTagName( 'form' );

    for( var formId=0;formId<elements.length;formId++ ) {
      for( var j=0;j<document.forms[ formId ].elements.length;j++ ) {
        callback( formId,
          document.forms[ formId ].elements[ j ] );
      }
    }

  },

/**
 *  Store webpage state in a cookie for restoring after a refresh.
 */

  saveState: function () {

    var collectCallback = function ( formId, element ) {
      var name  =  element.name;
      var value = element.value;

      if ( name && value ) {
        Refresh.formStates += formId +':fdelim:' +
          encodeURIComponent( name ) +':fdelim:' +
          encodeURIComponent( value ) +':ldelim:' ;
      }
    };

    this.formIterator( collectCallback );

    this.setCookie( 'formStates', this.formStates, 70 );
    this.debug( 'saving state', 2 );
    this.debug( Refresh.getCookie( 'formStates' ), 2 );


  },

/**
 *  Restore webpage state from cookie data.
 */

  restoreState: function () {

    Refresh.debug( 'formStates', 1 );
    var cookie = Refresh.getCookie( 'formStates' );
    Refresh.debug( cookie, 1 );

    if ( ! cookie ){
      // Refresh.setCookie( 'formStates', 'uninitialized', 60 );
    }

    cookie.split( ':ldelim:' ).map ( function ( line ) {
      var fields     = line.split( ':fdelim:' );
      var formId     = fields[0];
      var fieldName  = decodeURIComponent( fields[1] );
      var fieldValue = decodeURIComponent( fields[2] );
      Refresh.debug( fields, 1 );

      if ( document.forms[formId] ) {
        if ( document.forms[formId][fieldName] ) {
          document.forms[formId][fieldName].value = fieldValue;
        }
      }
    } );
  },

/**
 *  Utility method for setting a cookie.
 */

  setCookie: function ( cname, cvalue, csecs ) {

    var d = new Date();
    // d.setTime(d.getTime() + (exdays*24*60*60*1000));
    d.setTime( d.getTime() + ( csecs *1000 ) );
    var expires = 'expires='+d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires +
      ';domain='+ window.location.host +';path=/';
  },

/**
 *  Utility method for getting a cookie.
 */

  getCookie: function ( cname ) {

    var name = cname + '=';
    var ca = document.cookie.split( ';' );
    for( var i=0; i<ca.length; i++ ) {
      var c = ca[ i ];
      while ( c.charAt( 0 ) === ' ' ) {
        c = c.substring( 1 );
      }
      if ( c.indexOf( name ) === 0 ) {
        return c.substring( name.length, c.length );
      }
    }
    return '';
  },

/**
 *  Create css for the  widget.
 */

  widgetCss: function ( ) {

    var styleData = {
      '#rld-ctrl>h1': 'font-size:22px;border-bottom:1px solid #999;',
      '#rld-ctrl>i': 'color:#f9f;',
      '#rld-ctrl>a': 'width:100px;color:#ccc;border:1px solid #999;' +
        'padding:10px;margin:10px',
      '#rld-ctrl>a:hover': 'cursor:pointer;color:#fff;background:#999;',
      '.rld-close': 'font-size:20px;border:none !important;'+
        'position:relative;top:0px;left:450px;',
      '#rld-ctrl': 'font-family:arial;color:#fff;background:#333;border:2px outset #999;'+
        'width:500px;height:250px;position:fixed;right:1px;'+
        'z-index:201;opacity:0.9;color:#fff;padding:0px 0px 10px 40px;',
      '.rld-remember>label': 'width:150px;' +
        'left:5px;',
      '.rld-remember': 'display:block;height:20px;font-size:12px;margin-left:20px;',
    };

    var style = '<style>';
    for( var entry in styleData ) {
      style +=  entry +' { '+ styleData[entry] + '} ';
    }
    style += '</style>';

    return style;
  },

/**
 *  Creates a show/hide div for configuring options.
 */

  drawWidget: function ( body, showAnimation ) {
    var id = 'rld-ctrl';

    if ( document.getElementById( id ) ) {
    // return;
    //    this.closeWidget();
    }
    var html = this.widgetCss();
    var ctrl = document.createElement( 'div' );
    ctrl.setAttribute( 'id', id );
    ctrl.style.top='1000px';

    html += '<a class="rld-close" style="color:#fff;" onClick="Refresh.closeWidget()"'+
      '>X</a>';
    html += body;


    ctrl.innerHTML = html;

    document.body.appendChild( ctrl );

    var animation = function () {

      var ctrl = document.getElementById( 'rld-ctrl' );
      var position = ctrl.style.top.replace( /px$/, '' );

      if ( position > 1 ) {
        position -= 90;

        if ( position < 1 ) {
          position = 1;
        }

        ctrl.style.top = position + 'px';
        setTimeout ( animation, 10 );
      }
    };

    if ( showAnimation ) {
      animation();
    }
    else {
      ctrl.style.top='1px';

    }
    return false;

  },

/**
 *  Remove the div for configuring options.
 */

  closeWidget: function ( ) {
    var ctrl = document.getElementById( 'rld-ctrl' );
    ctrl.parentNode.removeChild( ctrl );
    Refresh.showingNotification = false;

  },

/**
 *  Set or store user preferences.
 */

  setWidgetOption: function ( key, value ) {

/*
    if ( value == 'apply' ) {
    }
*/
    Refresh.rldPrefs = value;

    var applyPreference = function () {
      Refresh.closeWidget();
      Refresh.lastCallback();
      Refresh.rldPrefs = '';
    };

    if ( document.getElementById( 'rld-remember' ).checked === true ) {

      Refresh.setCookie( 'rldPrefs', value, ( 60* 60 * 24 * 365 ) );
      Refresh.closeWidget();

      var html = '<h1 >Refresh preference saved</h1> <br>';
      html += '<label>To reset your preferences, clear your browser\'s '+
        'cookie cache.</label><br><br>';
      // html += '<a onclick="Refresh.closeWidget();">OK</label>';

      this.drawWidget( html, false );
      setTimeout ( applyPreference, 2000 );

      return;
    }


    if ( value === 'apply' ) {
      applyPreference();
    }
    else if ( value === 'ignore' ) {
      Refresh.closeWidget();
      Refresh.rldPrefs = '';
    }

  },

/**
 *  Show a notification if preferences are not set.
 */

  showNotification: function ( url ) {

    // see if the user has specified an 'always' action
    var rldPrefs = this.getCookie( 'rldPrefs' );
    Refresh.debug( 'Refresh Preferences Cookie: ' + rldPrefs, 1 );

    if ( ! rldPrefs ) {

      // see if the user has selected a 'just once' action
      rldPrefs = this.rldPrefs;
      Refresh.debug( 'Refresh Preferences Session: ' + rldPrefs, 1 );
    }

    if ( rldPrefs && rldPrefs === 'apply' ) {
      return true;
    }
    else if ( rldPrefs && rldPrefs === 'ignore' ) {
      return false;
    }


    var html = '<h1 >Refresh Notification</h1> <br>' +
      'Changed Resource: <i>'+url+' </i> <br><br><br>' +
      '<a '+
      'onClick="Refresh.setWidgetOption(\'global\', \'apply\');">'+
      'Apply </a>' +

      '<a '+
      'onClick="Refresh.setWidgetOption(\'global\', \'ignore\');">'+
      'Ignore</a> <br><br> '+

      '<form name="rld-remember" class="rld-remember"> ' +
      '<label>Always perform this action </label>' +
      '<input type="checkbox" id="rld-remember" name="rld-remember"'+
      'value="remember" />'+
      '</form>';

    if ( ! rldPrefs ) {

      // otherwise show them the options widget
      this.drawWidget( html, 'showAnimation' );
      this.showingNotification = true;
      return false;
    }

  },
  dump: function( str, level ) {

    if ( level <= this.debugLevel ) {
      console.log(str);
    }

  },

};
window.addEventListener( "load", function () { 
  Refresh.init(); 
  } );
