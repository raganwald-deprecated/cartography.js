/*

The MIT License

Copyright (c) 2010 Reginald Braithwaite and Unspace Interactive

http://reginald.braythwayt.com
http://unspace.ca

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

// requries underscore.js: http://documentcloud.github.com/underscore/

;(function (undefined) {
  
var _compile = function (instr) {
  if (!instr) {
    return function (node) {};
  }
  else if (true === instr) {
    return function (node) { return node.value(); };
  }
  else if ('function' === typeof(instr)) {
    return instr;
  }
  // support string functions from functional javascript
  else if ('function' === typeof(instr.toFunction)) {
    return instr.toFunction();
  }
  else if (_.isArray(instr) && 1 === instr.length) {
    return (function () {
      var inner_mapper = _compile(instr[0]);
      return function (node) {
        return _.map(node.value(), function (child_value) {
          return inner_mapper({
            value:  function () { return child_value; },
            parent: function () { return node; }
          })
        })
      }
    })();
  }
  else if ('object' === typeof(instr)) {
    return (function () {
      return function (node) {
        var all_keys = _.keys(instr);
        var default_mapper = (_.include(all_keys, '') ? _compile(instr['']) : false);
        var explicit_keys = _.reject(all_keys, "=== ''".lambda());
        var explicit_mapper = _.foldl(explicit_keys, 
          function (acc, key) {
            acc[key] = _compile(instr[key]);
            return acc;
          },
          {}
        );
        var node_value = node.value();
        var node_keys = _.keys(node_value);
        var mapper = explicit_mapper;
        var mapped_keys = explicit_keys;
        if (default_mapper) {
          var other_keys = _.reject(node_keys, function (k) { return _.include(explicit_keys, k); });
          mapper = _.foldl(other_keys, function (acc, other_key) {
              acc[other_key] = default_mapper;
              return acc;
            },
            _.clone(mapper)
          );
          mapped_keys = _.foldl(other_keys, function (acc, other_key) {
              acc.push(other_key);
              return acc;
            },
            mapped_keys
          );
        }
        return _.foldl(mapped_keys, 
          function (acc, key) {
            var child_node = {
              value:  function () { return node_value[key]; },
              parent: function () { return node; }
            };
            var result = mapper[key](child_node);
            if (undefined !== result) {
              acc[key] = result;
            }
            return acc;
          },
          {}
        );
      };
    })();
  }
};
  
Cartography = {

  instance: function (clazz, instr) {
    instr = (undefined === instr ? true : instr);
    return function (node) {
      return new clazz(_compile(instr)(node));
    }
  },

  compile: function (instr) {
    var compiled = _compile(instr);
    return function (value) {
      return compiled({
        value: function () { return value; },
        parent: function () {}
      });
    };
  }

};
  
})();