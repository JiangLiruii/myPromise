## 这是一个可以完全通过promise A+测试的promise实现.

你可以通过```yarn && yarn test``` 进行测试

```js
// 获取Promise对象
const Promise = require('./src/core.js');
// 现在只有一个方法,then
Promise.then()
```
采用es6规范,如需适配es5,请运行`yarn start`, 然后打开[http://localhost:8080/](http://localhost:8080/), 可以看到

- 先出现`in macrotask` 
- 紧接着是`9527`
- 然后是`another macrotask`
- 最后等待两秒后出现`spy`.

满足`eventloop` 中的 `macrotask` 和 `microtask`的标准.具体请参考`example.js`中的程序





