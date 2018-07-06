const state = {
  0: 'pending',
  1: 'fulfilled',
  2: 'rejected',
  3: 'adopted the state of another promise'
}
const noop = () => {};
const GLOBAL_ERROR = null;
const getType = Object.prototype.toString.call;

class Promise {
  constructor(fn) {
    this._deferredState = state["0"];
    this._state = state["0"];
    this._value = null;
    this._deferreds = null;
    if (Object.prototype.toString.call(fn) !== '[object Function]') {
      throw new TypeError('Promise constructor\'s argument is not a function');
    }
    if (fn === noop) return;
    doResolve(fn, this);
  }
  then(onFulfilled, onRejected) {
    if (this.constructor !== Promise) {
      return safeThen(this, onFulfilled, onRejected);
    }
    let promise = new Promise(noop);
    handle(this, new Handler(onFulfilled, onRejected, promise));
    return promise;
  }
}
const safeThen = (self, onFulfilled, onRejected) => {
  return new self.constructor((resolve, reject) => {
    let promise = new Promise(noop);
    promise.then(resolve, reject);
    handle(self, new Handler(onFulfilled, onRejected, promise))
  })
}
class Handler {
  constructor(onFulfilled, onRejected, promise) {
    this.onFulfilled = onFulfilled;
    this.onRejected = onRejected;
    this.promise = promise
  }
}
const doResolve = (fn, promise) => {
  let done = false;
  let res = tryCall(fn, 
    resolve_value => {
    if (done) return;
    done = true;
    resolve(promise, resolve_value);
    },
    reject_reason => {
      if(done) return;
      done = true;
      reject(promise, reject_reason);
    })
  if(!done && res === IS_ERROR) {
    done = true;
    reject(promise, GLOBAL_ERROR);
  }
}
const resolve = (promise, value) => {
  if (/[Object|Function]/.test(getType(value))) {
    let then = getThen(value);
    if (then instanceof IS_ERROR) return reject(promise, GLOBAL_ERROR);
  }
  if (then === promise.then && value instanceof Promise) {
    promise._state = state["3"];
    promise._value = value;
    finale(promise);
    return;
  } else if (getType(then) === '[object Function]') {
    doResolve(then.bind(value), promise);
    return;
  }
  promise._state = state["1"];
  promise._value = value;
  finale(promise)
}

const reject = (promise, value) => {
  promise._state = state["2"];
  promise._value = value;
  Promise._onReject && Promise._onReject(promise, value);
}

const finale = promise => {
  if (promise._deferredState === state["1"]) {
    handle(promise, promise._deferreds);
  } else if (promise._deferredState === state["2"]) {
    Array.prototype.forEach(promise._deferreds, defer => handle(promise,defer))
  }
  promise._deferreds = null;
}
const getThen = obj => {
  try {
    return obj.then;
  } catch(err) {
    GLOBAL_ERROR = err;
    return IS_ERROR;
  }
}
const tryCall = (fn, ...args) => {
  try {
    return fn(...args)
  } catch(err) {
    GLOBAL_ERROR = err;
    return IS_ERROR;
  }
}
const handle = (promise, deferred) => {
  while(promise._state === state["3"]) {
    promise = promise._value
  }
  if (promise._onHandle) {
    Promise._onHandle(promise);
  }
  if(promise._state === state["0"]) {
    if (promise._deferredState = state["0"]) {
      promise._deferredState = state["1"];
      promise._deferreds = deferred
      return;
    } else if (promise._deferredState = state["1"]) {
      promise._deferredState = state["2"];
      promise._deferreds = [promise._deferreds, deferred];
      return;
    }
    promise._deferreds.push(deferred);
    return;
  }
  handleResolved(promise, deferred);
}

const handleResolved = (promise, deferred) => {
  
}

