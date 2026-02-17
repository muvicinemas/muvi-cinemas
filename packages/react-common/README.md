# Alpha React Common

## Install

1.  We have the following peer dependencies:

    `react >= 16`

    `react-query >= 4`

    `zustand >= 3`

2.  Place the following line inside `.npmrc` file.

        //registry.npmjs.org/:_authToken=${NPM_TOKEN}

3.  Get NPM token and prepend it to `yarn add` command.

        NPM_TOKEN={your_secret_token} yarn add @alpha.apps/react-common

**_Note: This token change every year and shouldn’t be tracked by GIT._**

## Package API

#### `createReactQueryFns({})`:

This function is used to create react query helpers that help you create react query services later on.

```ts
const { createMutation, createQuery, createShared, createInfiniteQuery } =
  createReactQueryFns({
    // Interceptor Axios instance to use, Required
    axiosInstance: createAxiosInstance({
      apiBaseURL: 'https://jsonplaceholder.typicode.com',
    }),
  });
```

#### `createAxiosInstance({})`:

This function is used to create axios instance.

```ts
  const axiosInstance: AxiosInstance = createAxiosInstance({
    // Interceptor Base URL, Required
    apiBaseURL: 'https://jsonplaceholder.typicode.com',
    // Interceptor Timeout, Optional
    apiTimeout: 9000,
    // Extra custom http headers, Optional
    customConfigHeaders: {
      'x-device-platform': 'website'
    },
    // Custom axios interceptor request handler, when you pass this all other props ignored except apiBaseURL & apiTimeout, Optional
    interceptorRequestHandler: {
      // Axios interceptor request handler success callback that will be called on success, Required
      onFulfilled: (configs: AxiosRequestConfig) => configs,
      // Axios interceptor request handler fail callback that will be called on fail, Optional
      onRejected: (error: any) => error;

    };
    // The return value from this function will be passed to 'Accept-Language' http header, Optional
    getLang: () => 'en',
    // The return value from this function will be passed to 'Authorization' http header, Optional
    getToken: () => 'secret_user_token',
    /*
    This helper is used to Apply extra logic for language value to remove any q=0.9, q=1 values,
    the returned value from getLang function will passed as parameter to this function and the return value will be passed to 'Accept-Language' http header, Optional
    */
    langQualityValuesHandler: (lang: string) => lang;
  }),
```

## Services

Use `createMutation`, `createQuery`, `createShared`, `createInfiniteQuery` to create react query services.

## Stores

Use `createStore` to create zustand stores.

## Local Build

1. Clone the Repo.

2. `cd alpha-react-common/`.

3. Run `yarn`.

4. Run `yarn build:patch` to build the package into `[filename].tgz` file.

5. Copy `[filename].tgz` file to your project.

6. Run `yarn add ./[filename].tgz` to install the package.

7. Use it like any other library `import {} from @alpha.apps/react-common`.

_Happy Coding ☕️_

Made with ❤ by Alpha Apps

![Made with love in United Arab Emirates](https://madewithlove.now.sh/ae)
