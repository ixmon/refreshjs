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
