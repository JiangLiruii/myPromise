// use 'self' and 'global' instead of 'window' for both frame and worker
const getType = data => Object.prototype.toString.call(data);
let scope = getType(global) !== '[object Undefined]' ? global : self;
let BrowserMutationObserver = scope.MutationObserver || scope.WebkitMutationObserver;
// keep finished task to reduce GC churn
let freeTask = [];
let requestFlush, index;
  // queue to store tasks, pendingError to store error happened during task calling
let queue = [],pendingError = [];
  // to avoid big amount task cause bad performance in loop;
let capacity = 1024;



const flush = () => {
  while (index < queue.length) {
    var currentIndex = index;
    // Advance the index before calling the task. This ensures that we will
    // begin flushing on the next task the task throws an error.
    index = index + 1;
    queue[currentIndex].call();
    if (index > capacity) {
        for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
            queue[scan] = queue[scan + index];
        }
        queue.length -= index;
        index = 0;
    }
  }
  queue.length = 0;
  index = 0;
}

const makeRequestCallFromMutationObserver = callback => {
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
const makeRequestCallFromTimer = callback => {
  return function requestCall() {
    var timeoutHandle = setTimeout(handleTimer, 0);
    var intervalHandle = setInterval(handleTimer, 50);
    function handleTimer() {
        clearTimeout(timeoutHandle);
        clearInterval(intervalHandle);
        callback();
    }
  };
}
// call flush asap
if (getType(BrowserMutationObserver) === '[object Function]') {
  requestFlush = makeRequestCallFromMutationObserver(flush)
} else {
  // if not support DOM Mutation
  requestFlush = makeRequestCallFromTimer(flush)
}
// for error not throw at once after all events triggered
function throwFirstError() {
  if (pendingError.length){
    throw pendingError.shift()
  };
}
let requestErrorThrow = makeRequestCallFromTimer(throwFirstError);

class RawTask {
  constructor() {
    this.task = null;
  }
  call() {
    try {
      this.task.call()
    } catch (err) {
      // if has onError extension
      if (asap.onError) {
        asap.onError(err);
      } else {
        pendingError.push(err)
        requestErrorThrow();
      }
    } finally {
      this.task = null;
      freeTask[freeTask.length] = this;
    }
  }
}
export default function asap(task) {
  let rawTask;
  if (freeTask.length) {
    rawTask = freeTask.pop()
  } else {
    rawTask = new RawTask();
  }
  rawTask.task = task;
  new rawAsap(rawTask);
}

// to make queue be called only once ast 
class rawAsap {
  constructor(task) {
    if (!queue.length) {
      requestFlush();
    }
    queue[queue.length] = task;
  }
}