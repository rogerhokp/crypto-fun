module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  // transformIgnorePatterns: ['/node_modules/(?!escape-string-regexp)'],
  moduleNameMapper: {
    '@/(.*)': ['<rootDir>/$1'],
  },
  // transform: {
  //   '\\.js$': 'babel-jest',
  // },
};
