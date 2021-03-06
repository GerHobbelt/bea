(function() {
  var Argument, Type, expandCast, findOverload, fixt, isNativeType, isSameOverload, parseArg, parseClassDirective, parseDeclaration, tabify, trim, _;
  _ = require('./lib/underscore');
  trim = function(str) {
    return str.replace(/^\s+|\s+$/g, '');
  };
  tabify = function(str, ntabs) {
    var i, tabs;
    i = 0;
    tabs = '';
    while (i++ < ntabs) {
      tabs += '\t';
    }
    return _.map(str.split('\n'), function(line) {
      return tabs + line;
    }).join('\n');
  };
  parseArg = function(arg) {
    var ret, vals;
    ret = {};
    arg = trim(arg);
    vals = arg.split('=');
    if (vals.length > 1) {
      ret.value = vals[1];
    }
    arg = vals[0];
    arg = arg.replace(/\*/g, ' * ').replace(/\&/g, ' & ').replace(/\s+\*/g, '* ').replace(/\s+\&/g, '& ');
    arg = arg.replace(/\s{2,99}/g, ' ');
    arg = trim(arg);
    arg = arg.split(' ');
    if (arg.length === 1) {
      ret.type = arg[0];
      ret.name = '';
      return ret;
    }
    if (arg.length === 2) {
      if (arg[0] === 'const' || arg[1] === 'const' || arg[0] === 'const*' || arg[1] === 'const*') {
        ret.type = arg[0] + ' ' + arg[1];
        return ret;
      } else {
        ret.type = arg[0], ret.name = arg[1];
        return ret;
      }
    }
    ret.name = arg[arg.length - 1];
    ret.type = arg.slice(0, arg.length - 1).join(' ');
    return ret;
  };
  isNativeType = function(type) {
    var nativeTypes;
    nativeTypes = ['void', 'int', 'long', 'bool', 'char', 'double', 'short', 'float', 'size_t'];
    type = type.replace(/^\s*unsigned\s+|\s*signed\s+/, '');
    return _.any(nativeTypes, function(nt) {
      return nt === type;
    });
  };
  fixt = function(type) {
    if (/>$/.test(type)) {
      return type + ' ';
    }
    return type;
  };
  expandCast = function(cast, type) {
    if (cast) {
      if (cast === 'vector') {
        cast = 'bea::vector<>';
      }
      if (cast === 'string') {
        cast = 'bea::string';
      }
      if (cast === 'external') {
        cast = 'bea::external<>';
      }
    } else {
      if (type.isConst && type.rawType === 'char' && type.isPointer) {
        cast = 'bea::string';
      } else if (type.isPointer && isNativeType(type.rawType)) {
        cast = 'bea::external<>';
      }
    }
    if (cast && cast.indexOf('<>') !== -1) {
      cast = cast.replace(/<|>/g, '');
      cast = "" + cast + "<" + (fixt(type.rawType)) + ">";
    }
    return cast;
  };
  Type = (function() {
    function Type(org, namespace) {
      var ln, type, _ref;
      this.org = org;
      this.namespace = namespace;
      type = this.org.replace(/^\s*const\s+|\s*volatile\s+/, '');
      ln = type.indexOf('::');
      if (ln !== -1) {
        this.namespace = type.substring(0, ln);
        type = type.substring(ln + 2);
      }
      _ref = type.split(':@'), type = _ref[0], this.cast = _ref[1];
      this.type = type;
      this.rawType = type.replace(/^\s+|\s+$/g, '').replace(/\s*\&$/, '').replace(/\s*\*$/, '');
      this.isPointer = type.match(/\*\s*$/) != null;
      this.isRef = type.match(/\&\s*$/) != null;
      this.isConst = false;
      if (this.org.match(/^\s*const\s+/)) {
        this.isConst = true;
      }
      this.cast = expandCast(this.cast, this);
    }
    Type.prototype.fullType = function() {
      if (isNativeType(this.rawType)) {
        return this.org;
      }
      if (this.namespace) {
        return this.namespace + '::' + this.rawType;
      }
      return this.rawType;
    };
    Type.prototype.isNative = function() {
      return isNativeType(this.rawType);
    };
    return Type;
  })();
  Argument = (function() {
    function Argument(org, ns) {
      var cast, parsed, _ref;
      this.org = org;
      this.ns = ns;
      parsed = parseArg(this.org);
      this.cast = '';
      _ref = parsed.name.split(':@'), this.name = _ref[0], cast = _ref[1];
      this.type = new Type(parsed.type, this.ns);
      this.value = parsed.value;
      if (cast) {
        this.type.cast = expandCast(cast, this.type);
      }
    }
    return Argument;
  })();
  parseDeclaration = function(str, namespace) {
    var arg, args, argsEnd, argsStart, decla, fnArgs, fnDec, isPure, isStatic, isVirtual, parseArgs, _i, _len;
    str = str.replace(/\s+throw\(\)\s*;*/, '');
    argsStart = str.indexOf('(');
    argsEnd = str.lastIndexOf(')');
    if (argsStart === -1 || argsEnd === -1) {
      return false;
    }
    args = trim(str.slice(argsStart + 1, argsEnd));
    decla = trim(str.slice(0, argsStart));
    isPure = /\s*=\s*0/.test(str);
    parseArgs = function(args) {
      var char, cur, paran, ret, symbol, _i, _len;
      if (args.length === 0) {
        return [];
      }
      ret = [];
      cur = '';
      paran = 0;
      symbol = 0;
      for (_i = 0, _len = args.length; _i < _len; _i++) {
        char = args[_i];
        switch (char) {
          case ',':
            if (paran !== 0) {
              cur += char;
            } else {
              ret.push(cur);
              cur = '';
            }
            break;
          case '(':
            paran++;
            cur += char;
            break;
          case ')':
            paran--;
            cur += char;
            break;
          default:
            cur += char;
        }
      }
      if (paran === !0) {
        throw 'Mismatched (';
      }
      ret.push(cur);
      return ret;
    };
    if (args !== 'void') {
      args = parseArgs(args);
    } else {
      args = [];
    }
    fnArgs = [];
    for (_i = 0, _len = args.length; _i < _len; _i++) {
      arg = args[_i];
      fnArgs.push(new Argument(arg, namespace));
    }
    isVirtual = false;
    if (/^virtual\s+/.test(decla)) {
      decla = decla.replace(/^virtual\s+/, '');
      isVirtual = true;
    }
    isStatic = false;
    if (/^static\s+/.test(decla)) {
      decla = decla.replace(/^static\s+/, '');
      isStatic = true;
    }
    fnDec = new Argument(decla, namespace);
    return _.extend(fnDec, {
      args: fnArgs,
      virtual: isVirtual,
      pure: isPure,
      static: isStatic
    });
  };
  isSameOverload = function(overload1, overload2) {
    return overload1.name === overload2.name && overload1.args.length === overload2.args.length && _.all(overload1.args, function(a1, i) {
      return a1.type.type === overload2.args[i].type.type;
    });
  };
  findOverload = function(list, overload) {
    return _.detect(list, function(over) {
      return isSameOverload(over, overload);
    });
  };
  parseClassDirective = function(node) {
    var className, derived, exposedName, ret, tmp, _derived, _ref, _ref2;
    className = node.text.replace(/{\s*$/, '');
    className = (className.replace(/^\s*@class\s+|^\s*@static\s+/, '')).replace(/\'|\"/g, '');
    _ref = className.split(' : '), className = _ref[0], _derived = _ref[1];
    if (_derived) {
      derived = _.map(_derived.split(','), function(derived) {
        return derived.replace(/\s*public\s+/, '').replace(/^\s+|\s+$/, '');
      });
    }
    tmp = className.split(' ');
    className = tmp[0];
    exposedName = ((_ref2 = tmp[1]) != null ? _ref2 : className).replace(/\s+/g, '_');
    ret = {
      className: className,
      exposedName: exposedName,
      parentClass: derived
    };
    return ret;
  };
  exports.u = {
    parseArg: parseArg,
    tabify: tabify,
    trim: trim,
    parseDeclaration: parseDeclaration,
    isSameOverload: isSameOverload,
    findOverload: findOverload,
    Type: Type,
    Argument: Argument,
    isNativeType: isNativeType,
    parseClassDirective: parseClassDirective
  };
}).call(this);
