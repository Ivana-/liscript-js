// "use strict"

/////////////////////////////////////////////////////////////////////////////////
// TYPES
/////////////////////////////////////////////////////////////////////////////////

const cons = (x, y) => [x,y]
const car  = (l)    => l[0]
const cdr  = (l)    => l[1]

const nil = cons(null, null)
const isnil = (l) => car(l) === null && cdr(l) === null

const isConslist = (o) => Array.isArray(o)


class BO {
  static ADD = new BO("ADD")
  static SUB = new BO("SUB")
  static MUL = new BO("MUL")
  static DIV = new BO("DIV")
  static NDIV = new BO("NDIV")
  static MOD = new BO("MOD")
  static SCONCAT = new BO("SCONCAT")

  constructor(name) {
    this.name = name
  }
}

class BP {
  static GT = new BP("GT")
  static GTE = new BP("GTE")
  static LT = new BP("LT")
  static LTE = new BP("LTE")
  static EQ = new BP("EQ")
  static NOEQ = new BP("NOEQ")

  constructor(name) {
    this.name = name
  }
}

class SF {
  static DEF = new SF("DEF")
  static SET = new SF("SET")
  static QUOTE = new SF("QUOTE")
  static TYPEOF = new SF("TYPEOF")
  static CONS = new SF("CONS")
  static CAR = new SF("CAR")
  static CDR = new SF("CDR")
  static COND = new SF("COND")
  static PRINT = new SF("PRINT")
  static READ = new SF("READ")
  static EVAL = new SF("EVAL")
  static EVALIN = new SF("EVALIN")
  static LAMBDA = new SF("LAMBDA")
  static MACRO = new SF("MACRO")
  static SYMBOL = new SF("SYMBOL")
  static DO = new SF("DO")

  constructor(name) {
    this.name = name
  }
}

const kv_BO = Object.freeze({
  '+': BO.ADD,
  '-': BO.SUB,
  '*': BO.MUL,
  '/': BO.DIV,
  '//': BO.NDIV,
  'mod': BO.MOD,
  '++': BO.SCONCAT
})

const kv_BP = Object.freeze({
  '>': BP.GT,
  '>=': BP.GTE,
  '<': BP.LT,
  '<=': BP.LTE,
  '=': BP.EQ,
  '/=': BP.NOEQ
})

const kv_SF = Object.freeze({
  'def': SF.DEF,
  'set!': SF.SET,
  'quote': SF.QUOTE,
  'typeof': SF.TYPEOF,
  'cons': SF.CONS,
  'car': SF.CAR,
  'cdr': SF.CDR,
  'cond': SF.COND,
  'print': SF.PRINT,
  'read': SF.READ,
  'eval': SF.EVAL,
  'eval-in': SF.EVALIN,
  'lambda': SF.LAMBDA,
  'macro': SF.MACRO,
  'symbol': SF.SYMBOL,
  'do': SF.DO
})

const obj2mapFlipKV = (object) => {
  const m = new Map()
  for (const property in object) m.set(object[property], property)
  return m
}

const vk_BO = obj2mapFlipKV(kv_BO)
const vk_BP = obj2mapFlipKV(kv_BP)
const vk_SF = obj2mapFlipKV(kv_SF)

class Sym {
  constructor(name) {
    this.name = name
  }
}

class Lambda {
  constructor(args, body, env) {
    this.args = args
    this.body = body
    this.env = env
  }
}

class Macro {
  constructor(args, body) {
    this.args = args
    this.body = body
  }
}

class LambdaCall {
  constructor(lam, frame) {
    this.lam = lam
    this.frame = frame
  }
}

/////////////////////////////////////////////////////////////////////////////////
// SHOW
/////////////////////////////////////////////////////////////////////////////////

const show = (o) => {
  if (isConslist(o)) {
    var r = ''
    while (!isnil(o)) {
      r = r + (r === '' ? '' : ' ') + show(car(o))
      o = cdr(o)
    }
    return '(' + r + ')'
  }
  else if (typeof o === "boolean") return o ? 'true' : 'false'
  else if (typeof o === "string") return '"' + o + '"'
  else if (o instanceof BO) return vk_BO.get(o)
  else if (o instanceof BP) return vk_BP.get(o)
  else if (o instanceof SF) return vk_SF.get(o)
  // else if (o instanceof BO) return o.name
  // else if (o instanceof BP) return o.name
  // else if (o instanceof SF) return o.name
  else if (o instanceof Sym) return o.name
  else if (o instanceof Lambda) return '(lambda ' + show(o.args) + ' ' + show(o.body) + ')'
  else if (o instanceof Macro) return '(macro ' + show(o.args) + ' ' + show(o.body) + ')'
  else if (o instanceof LambdaCall) return 'LAMBDA-CALL: ' + o.frame
  else return '' + o
}

/////////////////////////////////////////////////////////////////////////////////
// PARSER
/////////////////////////////////////////////////////////////////////////////////

const emptyStr = (s) => !s || s.length === 0

const prsval = (s) => {
  if (s === 'true') return true
  else if (s === 'false') return false
  else if (kv_BO[s]) return kv_BO[s]
  else if (kv_BP[s]) return kv_BP[s]
  else if (kv_SF[s]) return kv_SF[s]
  else {
    const n = Number(s)
    if (!isNaN(n)) return n
    return new Sym(s)
  }
}

const subs = (s) => !s ? '' + s : s.length < 20 ? s : s.slice(0, 20) + '...'

const lstripTrash = (s) => {
  s = s.trimStart()
  while (s && s.slice(0, 1) === ';') {
    end = s.indexOf(';', 1)
    if (end != -1)
      s = s.slice(end + 1).trimStart()
    else
      throw new Error('closed \';\' is absent: ' + subs(s))
  }
  return s
}

const prslist = (s) => {
  const m = []
  while (true) {
    s = lstripTrash(s)
    if (s === '')
      throw new Error('closed \')\' is absent')
    else if (s.slice(0, 1) === ')')
      break
    [x, s] = prs(s)
    m.push(x)
  }
  var r = nil
  while (m.length) r = cons(m.pop(), r)
  return [r, s.slice(1)]
}

const prs = (s) => {
  s = lstripTrash(s)
  if (emptyStr(s)) return [nil, '']

  c = s.slice(0, 1)
  z = s.slice(1)
  if (c === '(')
    return prslist(z)
  else if (c === ')')
    throw new Error('extra closed \')\': ' + subs(s))
  else if (c === '"') {
    end = s.indexOf('"', 1)
    if (end != -1)
      return [z.slice(0, end - 1), z.slice(end)]
    else
      throw new Error('closed \'\"\' is absent: ' + subs(s))
  } else if (c === '\'') {
    const [x, ss] = prs(z)
    return [cons(SF.QUOTE, cons(x, nil)), ss]
  } else {
    const re = /\s|\(|\)|\"|;|$/;
    end = s.search(re)
    return [prsval(s.slice(0, end)), s.slice(end)]
  }
}

const parse = (s) => {
  const [x, xs] = prs(s)
  ss = lstripTrash(xs)
  if (emptyStr(ss)) return x
  const [y, zz] = prs('(' + ss + ')')
  if (emptyStr(zz))
    return cons(x, y)
  else
    throw new Error('extra symbols: ' + subs(zz))
}

/////////////////////////////////////////////////////////////////////////////////
// ENVIRONMENT
/////////////////////////////////////////////////////////////////////////////////

class Env {
  constructor(frame, parent) {
    this.frame = frame
    this.parent = parent
  }

  getvar(k, s) {
    var e = this
    while (e) {
      if (e.frame.has(k)) return e.frame.get(k)
      e = e.parent
    }
    return s instanceof Sym ? s : new Sym(k)
  }

  defvar(k, v) { this.frame.set(k, v) }

  setvar(k, v) {
    var e = this
    while (e) {
      if (e.frame.has(k)) {
          e.frame.set(k, v)
          break
      }
      e = e.parent
    }
  }
}

/////////////////////////////////////////////////////////////////////////////////
// EVAL utils
/////////////////////////////////////////////////////////////////////////////////

const objectsAreEqual = (x, y) => {
  if (typeof x != typeof y)
    return false
  else if (x instanceof Sym)
    return x.name === y.name
  else if (isConslist(x)) {
    while (!isnil(x) && !isnil(y)) {
      if (!objectsAreEqual(car(x), car(y))) return false
      x = cdr(x)
      y = cdr(y)
    }
    return isnil(x) && isnil(y)
  } else return x === y
}

const strOrShow = (o) => typeof o === "string" ?  o : show(o)

const bo = (op, a, b) => {
  if      (op === BO.ADD) return a + b
  else if (op === BO.SUB) return a - b
  else if (op === BO.MUL) return a * b
  else if (op === BO.DIV) return a / b // Number.isInteger(a) && Number.isInteger(b) ? Math.trunc(a / b) : a / b
  else if (op === BO.NDIV) return Math.trunc(a / b)
  else if (op === BO.MOD) return a % b
  else if (op === BO.SCONCAT) return strOrShow(a) + strOrShow(b)
  else return undefined
}

const foldbo = (op, t, e, d) => {
  if (isnil(t)) throw new Error('no operands for ariphmetic operation: ' + show(op))

  r = evalrec(car(t), e, d, true)
  t = cdr(t)
  while (!isnil(t)) {
    r = bo(op, r, evalrec(car(t), e, d, true))
    t = cdr(t)
  }
  return r
}

const bp = (op, a, b) => {
  if      (op === BP.GT)   return a > b
  else if (op === BP.GTE)  return a >= b
  else if (op === BP.LT)   return a < b
  else if (op === BP.LTE)  return a <= b
  else if (op === BP.EQ)   return objectsAreEqual(a, b)
  else if (op === BP.NOEQ) return !objectsAreEqual(a, b)
  else return undefined
}

const foldbp = (op, t, e, d) => {
  if (isnil(t)) return true

  var a = evalrec(car(t), e, d, true)
  t = cdr(t)
  while (!isnil(t)) {
    const b = evalrec(car(t), e, d, true)
    if (!bp(op, a, b)) return false
    a = b
    t = cdr(t)
  }
  return true
}

const evalListToArray = (t, e, d) => {
  const m = []
  while (!isnil(t)) {
    m.push(evalrec(car(t), e, d, true))
    t = cdr(t)
  }
  return m
}

const objectEvalToSymbolName = (o, e, d) => {
  if (o instanceof Sym) return o.name
  else if (typeof o === "string") return o
  else return strOrShow(evalrec(o, e, d, true))
}

const getBody = (o) => {
  return isConslist(o) && !isnil(o) && isnil(cdr(o)) ? car(o) : o
}

const getMapNamesValues = (ns, bs, e, d, evalFlag) => {
  const r = new Map()
  while (!isnil(ns) && !isnil(bs)) {
    var v
    if (isnil(cdr(ns)) && !isnil(cdr(bs))) {
      if (evalFlag) {
        const m = evalListToArray(bs, e, d)
        v = nil
        while (m.length) v = cons(m.pop(), v)
      } else {
        v = bs
      }
    } else {
      v = evalFlag ? evalrec(car(bs), e, d, true) : car(bs)
    }
    r.set(car(ns).name, v)
    ns = cdr(ns)
    bs = cdr(bs)
  }
  return [r, ns]
}

const macroSubst = (body, kv) => {
  if (body instanceof Sym)
    return kv.has(body.name) ? kv.get(body.name) : body
  else if (isConslist(body))
    return isnil(body) ? nil : cons(macroSubst(car(body), kv), macroSubst(cdr(body), kv))
  else return body
}

const macroexpand = (m, t, e, d) => {
  return macroSubst(m.body, getMapNamesValues(m.args, t, e, d, false)[0]) // TODO add carrying!
}

const getTypeName = (o) => {
  return isConslist(o) ? 'ConsList'
  : o instanceof Sym ? "Symbol"
  : o instanceof Lambda ? "Lambda"
  : o instanceof Macro ? "Macro"
  : typeof o
}

/////////////////////////////////////////////////////////////////////////////////
// EVAL
/////////////////////////////////////////////////////////////////////////////////

var evalCalls = 0
var maxStack = 0
var TCOFlag = true
var showStatFlag = false
const symbolOK = new Sym('OK')

const evalrec = (o, e, stacklevel, strict) => {

  evalCalls = evalCalls + 1
  maxStack = Math.max(maxStack, stacklevel + 1)
  const d = stacklevel + 1

  if (o instanceof Sym)
    return e.getvar(o.name, o)

  else if (isConslist(o)) {
    if (isnil(o)) return o

    var t = cdr(o)
    const h = evalrec(car(o), e, d, isnil(t) ? strict : true)

    if (h instanceof BO)
      return foldbo(h, t, e, d)

    else if (h instanceof BP)
      return foldbp(h, t, e, d)

    else if (h instanceof SF) {

      if (h === SF.DEF || h === SF.SET) {
        while (!isnil(t) && !isnil(cdr(t))) {
          const s = objectEvalToSymbolName(car(t), e, d)
          const v = evalrec(car(cdr(t)), e, d, true)
          if (h === SF.DEF) e.defvar(s, v)
          else e.setvar(s, v)
          t = cdr(cdr(t))
        }
        return symbolOK
      }
      else if (h === SF.QUOTE)
        return car(t)

      else if (h === SF.TYPEOF)
        return getTypeName(evalrec(car(t), e, d, true))

      else if (h === SF.CONS) {
        const m = evalListToArray(t, e, d)
        var v = m.pop()
        if (!isConslist(v)) v = cons(v, nil)
        while (m.length) v = cons(m.pop(), v)
        return v
      }
      else if (h === SF.CAR) {
        const a = evalrec(car(t), e, d, true)
        return isConslist(a) && !isnil(a) ? car(a) : a
      }
      else if (h === SF.CDR) {
        const a = evalrec(car(t), e, d, true)
        return isConslist(a) && !isnil(a) ? cdr(a) : nil
      }
      else if (h === SF.COND) {
        while (!isnil(t) && !isnil(cdr(t))) {
          if (evalrec(car(t), e, d, true)) return evalrec(car(cdr(t)), e, d, strict)
          t = cdr(cdr(t))
        }
        return isnil(t) ? nil : evalrec(car(t), e, d, strict)
      }
      else if (h === SF.PRINT || h === SF.READ) {
        const m = evalListToArray(t, e, d)
        var s = ''
        for (const x of m)
          s += strOrShow(x)
        print(s)
        if (h === SF.PRINT) return symbolOK
        else return parse(readline())
      }
      else if (h === SF.EVAL)
        return evalrec(evalrec(car(t), e, d, true), e, d, true)

      else if (h === SF.EVALIN) {
        const a = evalrec(car(t), e, d, true)
        if (a instanceof Lambda)
          return evalrec(getBody(cdr(t)), a.env, d, true)
        else
          throw new Error('eval-in not in lambda \'' + show(a) + '\'')
      }
      else if (h === SF.LAMBDA)
        return new Lambda(car(t), getBody(cdr(t)), e)

      else if (h === SF.MACRO)
        return new Macro(car(t), getBody(cdr(t)))

      // else if (h === SF.MACROEXPAND) {
      //   const a = evalrec(car(t), e, d, true)
      //   if (a instanceof Macro)
      //     return macroexpand(a, cdr(t), e, d)
      //   else
      //     throw new Error('macroexpand not with macro \'' + show(a) + '\'')
      // }
      else if (h === SF.SYMBOL) {
        const a = evalrec(car(t), e, d, true)
        return a instanceof Sym ? a : new Sym(strOrShow(a))
      }
      else if (h === SF.DO) {
        var v = symbolOK
        while (!isnil(t)) {
          v = evalrec(car(t), e, d, isnil(cdr(t)) ? strict : true)
          t = cdr(t)
        }
        return v
      }
      else
        throw new Error('Unrecognized special form \'' + str(h) + '\'')
    }
    else if (h instanceof Lambda) {
      const [m, ns] = getMapNamesValues(h.args, t, e, d, true)
      if (!isnil(ns))
        return new Lambda(ns, h.body, new Env(m, h.env))
      else if (!TCOFlag)
        return evalrec(h.body, new Env(m, h.env), d, true)
      else {
        var v = new LambdaCall(h, m)
        if (strict)
          while (v instanceof LambdaCall)
            v = evalrec(v.lam.body, new Env(v.frame, v.lam.env), d, false)
        return v
      }
    }
    else if (h instanceof Macro)
      return evalrec(macroexpand(h, t, e, d), e, d, true)
    else {
      throw new Error('Illegal head form \'' + show(car(o)) + '\' -> ' + show(h))
    }
  }
  else return o
}

/////////////////////////////////////////////////////////////////////////////////
// REPL
/////////////////////////////////////////////////////////////////////////////////

var lastInput = ''
const globalenv = new Env(new Map, null)

const showException = (s, e) => print(s + e.name + " - " + e.message + "\n" + e.stack)
// const showException = (s, e) => print(s + e.name + " - " + e.message)

const evallisp = (s) => {
  evalCalls = 0
  maxStack = 0

  try {
    o = parse(s)
  } catch(e) {
    showException('PARSING ERROR: ', e)
    return
  }
  // print(show(o))

  try {
    r = evalrec(o, globalenv, 0, true)
  } catch(e) {
    showException('EVAL ERROR: ', e)
    return
  }
  print(show(r))

  if (showStatFlag) print('max stack: ' + maxStack + ', eval calls: ' + evalCalls)
}

const loadfile = (filename) => {
  try {
    s = read(filename)
  } catch(e) {
    showException('FILE ERROR: ', e)
    return
  }
  evallisp("do " + s)
}

const replcmd = (s) => {
  const m = s.match(/\S+/g)
  cmd = m[0]
  if (cmd === ':l')
    loadfile(m[1])
  else if (cmd === ':')
    evalinput(lastInput)
  else if (cmd === ':help')
    loadfile('help.liscript')
  else if (cmd === ':tco')
    TCOFlag = !TCOFlag
  else if (cmd === ':stat')
    showStatFlag = !showStatFlag
  else print('bad REPL command: ' + cmd)
}

const evalinput = (s) => {
  if (emptyStr(s)) return
  else if (s.slice(0, 1) === ':') replcmd(s)
  else evallisp(s)
}

const repl = () => {
  loadfile('standard_library.liscript')
  // loadfile('demo1.liscript')

  while (true) {
    print((TCOFlag ? 't' : 'n') + ' >>> ')
    s = readline()
    if (s === ':q') break
    if (s != ':') lastInput = s
    evalinput(s)
  }
}

repl()
