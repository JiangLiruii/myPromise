// use 'self' and 'global' instead of 'window' for both frame and worker
const getType = Object.prototype.toString.bind(null);
let scope = getType(global) !== '[object Undefined]' ? global : self;
let BrowserMutationObserver = scope.MutationObserver || scope.WebkitMutationObserver;
let freeTask = [];
let requestFlush, index, queue = [],pendingError = [],
  flushing = false;



const flush = () => {
  for (index = queue.length - 1; index >= 0; index--) {
    let currentIndex = index;
    queue[currentIndex].call();
  }
  queue = [];
  flushing = false
}

// for not support DOM Mutation
const makeRequestCallFromTimer = callback => {
  return function requestCall() {
    let timeoutHandle = setTimeout(handleTimer, 0);
    // for firefox worker
    let intervalHandle = setInterval(handleTimer, 50);
    function handleTimer(){
      clearTimeout(timeoutHandle);
      clearInterval(intervalHandle);
      callback()
    }
  }
}

const makeRequestCallFromMutationObserver = callback => {
  console.log(123);
  let fake_data = true;
  let observer = new BrowserMutationObserver(callback)
  let node = document.createTextNode('');
  // observe data change
  observer.observer(node, {
    characterData: true
  });
  // change fakedata to make trigger observer callback which will be queued in microtask
  return function requestCall() {
    fake_data = !fake_data;
    node.data = fake_data;
  }
}

if (getType(BrowserMutationObserver) === '[object Function]') {
  requestFlush = makeRequestCallFromMutationObserver(flush)
} else {
  // if not support DOM Mutation
  requestFlush = makeRequestCallFromTimer(flush)
}

class RawTask {
  constructor() {
    this.task = null;
  }
  call() {
    try {
      this.task.call()
    } catch (err) {
      // if asap own onError handler
      if (asap.onError) {
        asap.onError(err);
      } else {
        pendingError.push(err)
        requestErrorThrow();
      }
    } finally {
      this.task = null;
    }
  }
}
export const asap = (task) => {
  let rawTask;
  if (freeTask.length) {
    rawTask = freeTask.pop()
  } else {
    rawTask = new RawTask();
  }
  rawTask.task = task;
  new rawAsap(rawTask);
}
function throwFirstError() {
  if (pendingError.lengt){
    throw pendingError.shift()
  };
}
var requestErrorThrow = makeRequestCallFromTimer(throwFirstError);
export class rawAsap {
  constructor(task) {
    if (!queue.length && flushing === false) {
      requestFlush();
      // make sure single flush at same time
      flushing = true;
    }
    queue.push(task);
    flushing = false;
  }
}
rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;
rawAsap.requestFlush = requestFlush;