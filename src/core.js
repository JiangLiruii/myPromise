import asap from './asap'
let IS_ERROR = {};
let GLOBAL_ERROR = null;
function noop(){};
/**
 * 0 -- pending
 * 1 -- onfulfilled
 * 2 -- rejected
 * 3 -- adopt another promise as _value
 * @param { resolve() method parameter } fn 
 */
class Promise {
    constructor(fn) {
        if (typeof fn !== 'function') {
            throw new TypeError('Promise constructor\'s argument is not a function');
        }
        this.state = 0;
        this.value = null
        this.defers = [];
        if( fn === noop ) return;
        doResolve(fn, this)
    }
    /**
     * then chain call eg. a.then(b).then(c)
     * a.then(b) return res.then(c)
     */
    then(onFulfilled, onRejected) {
        let res = new Promise(noop);
        handle(this, new Handler(onFulfilled, onRejected, res))
        return res;
    }
    done(onFulfilled, onRejected) {
        // make new promise which state always to be 0, for no resolve at all;
        let promise = arguments.length ? this.then.apply(this, arguments) : this;
        // set onRejected
        promise.then(null,err => setTimeout(()=> {throw err}, 0));
    }
}
Promise.resolve = (value) =>{
    // create new promise and put it in resolved statue
    function valueTopromise(value) {
        let p = new Promise(noop);
        p.state = 1;
        p.value = value;
        return p;
    }
    if (value instanceof Promise) return value;
    if ([null, undefined, true, false, 0, ''].indexOf(value) !== -1) return valueTopromise(value);
    if (typeof value === 'object' || typeof value === 'function') {
        let then = getThen(value);
        if (then === IS_ERROR) {
            return new Promise((resolve, reject) => reject(GLOBAL_ERROR));
        }
        if (typeof then === 'function') {
            return new Promise(then.bind(value));
        }
    }
    return valueTopromise(value)
}
class Handler{
    constructor(onFulfilled, onRejected, promise) {
        this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
        this.onRejected = typeof onRejected === 'function' ? onRejected : null;
        this.promise = promise; 
    }
}
function handle(promise, defer) {
    // if promise.value is a promise, the new resolved promise will assign to it until not promise anymore.
    while (promise.state === 3) {
        promise = promise.value
    }
    // for handle extend
    if (Promise._onHandle){Promise._onHandle(promise)};
    // if state is pending
    if (promise.state === 0) {
        // add defer including callback in defers queue
        promise.defers.push(defer)
        return;
    }
    // async call
    handleResolve(promise, defer)
}

function handleResolve(promise, defer) {
    asap(function() {
        let cb = promise.state === 1 ? defer.onFulfilled : defer.onRejected;
        // if no callback in then method
        if (cb === null) {
            promise.state === 1 ? resolve(defer.promise, promise.value) : reject(defer.promise, promise.value);
            return;
        }
        // if callback exists
        let ret = tryCallOne(cb, promise.value);
        
        ret === IS_ERROR ? 
            reject(defer.promise, GLOBAL_ERROR) :
            resolve(defer.promise, ret)
    })
}

function resolve(promise, newValue) {
    // cannot be same one
    if (newValue === promise) {
        return reject(promise, new TypeError('a promise cannot resolve itself'))
    }
    if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = getThen(newValue);
        if (then === IS_ERROR) {
            return reject(promise, GLOBAL_ERROR);
        }
        /**
         *  to handle resolve which is one Promise,such as
         *  let a = new Promise((res)=>res(111))
         *  let b = new Promise((res) => res(a))
         */
        if(then === promise.then && newValue instanceof Promise) {
            promise.state = 3;
            promise.value = newValue;
            finale(promise);
            return;
        } else if (typeof then === 'function') {
            doResolve(then.bind(newValue), promise);
            return;
        }
    }
    promise.state = 1;
    promise.value = newValue;
    finale(promise)
}
function reject(promise, reason) {
    promise.state = 2;
    promise.value = reason;
    finale(promise);
}

function finale(promise) {
    let len = promise.defers.length
    if (len > 0) {
        for (let i = 0; i < len; i ++){
            handle(promise, promise.defers[i])
        }
        promise.defers = null;
    }
}
function tryCallOne(fn, a) {
    try {
      return fn(a);
    } catch (ex) {
      GLOBAL_ERROR = ex;
      return IS_ERROR;
    }
  }
function tryCallTwo(fn, a, b) {
    try {
        fn(a, b);
    } catch (ex) {
        GLOBAL_ERROR = ex;
        return IS_ERROR;
    }
}
function getThen(obj) {
    try {
        return obj.then
    } catch(ex) {
        GLOBAL_ERROR = ex;
        return IS_ERROR
    }
}
function doResolve(fn, promise) {
    let done = false;
    let res = tryCallTwo(fn, (value) => {
        // guarantee resolve or reject only call once 
        if (done) return;
        done = true;
        resolve(promise, value)
    }, (reason) => {
        if (done) return;
        done = true;
        reject(promise, reason)
    });
    
    // not call any of resolve or reject
    if(!done && res === IS_ERROR) {
        done = true;
        reject(promise, GLOBAL_ERROR)
    }
}
module.exports = Promise;
