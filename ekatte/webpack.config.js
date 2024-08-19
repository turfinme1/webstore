import path from 'path';
const __dirname = import.meta.dirname;
    
export default {
  entry: './src/index.js', // Entry point for your application
  output: {
    filename: 'bundle.js', // Output file name
    path: path.resolve(__dirname, 'src', 'js'), // Output directory (absolute path)
    publicPath: '/dist/', // Public URL of the output directory when referenced in a browser
    module: true, // Indicates that output should use the module format
    environment: {
      module: true, // Indicates that the generated code should be in module format
    }
  },
  experiments: {
    outputModule: true, // Enable experimental module output
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Apply this rule to .js files
        exclude: /node_modules/, // Exclude node_modules directory
        use: {
          loader: 'babel-loader', // Use Babel loader to transpile ES6+ code to ES5
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'], // Automatically resolve certain extensions
  },
  devtool: 'source-map', // Generate source maps for debugging
  mode: 'development', // Set the mode to development (change to 'production' for production builds)
};
