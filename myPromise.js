import { asap } from './asap';
const state = {
  0: 'pending',
  1: 'fulfilled',
  2: 'rejected',
  3: 'adopted the state of another promise'
}
// define empty function to new Promise
const noop = () => {};
// get and set global ERROR
const GLOBAL_ERROR = null, IS_ERROR = {};
// evaluate data type
const getType = Object.prototype.toString.bind(null)
class MyPromise {
  constructor(fn) {
    this._deferredState = state["0"];
    this._state = state["0"];
    this._value = null;
    this._deferreds = null;
    if (Object.prototype.toString.call(fn) !== '[object Function]') {
      throw new TypeError('Promise constructor\'s argument is not a function');
    }
    if (fn === noop) return;
    // start resolve promise sync
    doResolve(fn, this);
  }
  then(onFulfilled, onRejected) {
    // for other not promise object to use then method
    if (this.constructor !== MyPromise) {
      return this.safeThen(this, onFulfilled, onRejected);
    }
    // new an empty promise with fulfill and reject to handle this promise
    let promise = new MyPromise(noop);
    handle(this, new Handler(onFulfilled, onRejected, promise));
    return promise;
  }
  safeThen(self, onFulfilled, onRejected) {
    return new self.constructor((resolve, reject) => {
      let promise = new MyPromise(noop);
      promise.then(resolve, reject);
      handle(self, new Handler(onFulfilled, onRejected, promise))
    })
  }
}
class Handler {
  constructor(onFulfilled, onRejected, promise) {
    this.onFulfilled = onFulfilled;
    this.onRejected = onRejected;
    this.promise = promise
  }
}
const doResolve = (fn, promise) => {
  // finish flag
  let done = false;
  console.log('doing resolve')
  // result of fn(resolve,reject)
  let res = tryCallTwo(fn,
    resolve_value => {
      if (done) return;
      done = true;
      resolve(promise, resolve_value);
    },
    reject_reason => {
      if (done) return;
      done = true;
      reject(promise, reject_reason);
    })
  if (!done && res === IS_ERROR) {
    done = true;
    reject(promise, GLOBAL_ERROR);
  }
}
const resolve = (promise, value) => {
  console.log(value)
  if (/[Object|Function]/.test(getType(value))) {
    let then = value => {
      try {
        return value.then;
      } catch (err) {
        GLOBAL_ERROR = err;
        debugger;
        return IS_ERROR;
      }
    }
    if (then === IS_ERROR) return reject(promise, GLOBAL_ERROR);
    if (then === promise.then && value instanceof MyPromise) {
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
}

const reject = (promise, value) => {
  promise._state = state["2"];
  promise._value = value;
  MyPromise._onReject && MyPromise._onReject(promise, value);
}

const finale = promise => {
  if (promise._deferredState === state["1"]) {
    handle(promise, promise._deferreds);
  } else if (promise._deferredState === state["2"]) {
    Array.prototype.forEach(promise._deferreds, defer => handle(promise, defer))
  }
  promise._deferreds = null;
}

const tryCallTwo = (fn, arg1, arg2) => {
  try {
    return fn(arg1, arg2)
  } catch (err) {
    GLOBAL_ERROR = err;
    return IS_ERROR;
  }
}
const tryCallOne = (fn, arg) => {
  try {
    return fn(arg)
  } catch (err) {
    GLOBAL_ERROR = err;
    return IS_ERROR;
  }
}
const handle = (promise, deferred) => {
  console.log(promise._state)
  while (promise._state === state["3"]) {
    promise = promise._value
  }
  if (promise._onHandle) {
    MyPromise._onHandle(promise);
  }
  if (promise._state === state["0"]) {
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
  asap(() => {
    let cb = promise._deferredState === state["1"] ? deferred.onFulfilled : deferred.onRejected;
    if (!cb) {
      return promise._state === state["1"] ? resolve(deferred.promise, promise._value) : reject(deferred.promise, promise._value);
    }
    let ret = tryCallOne(cb, promise._value);
    ret === IS_ERROR ? reject(deferred.promise, promise._value) : resole(deferred.promise, promise._value);
  })
};

window.MyPromise = MyPromise;
