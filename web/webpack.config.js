const path = require("path");
const TerserJSPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

const config = {
	optimization: {
		minimizer: [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})],
	},
	module: {
		rules: [
			{
				loader: "babel-loader",
				test: /\.m?js$/,
				// exclude: /(node_modules|bower_components)/,
				options: {
					presets: ["@babel/preset-env"],
					plugins: ["@babel/plugin-transform-runtime"],
				},
			},
			{
				test: /\.less|\.css$/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader,
					},
					{
						loader: "css-loader",
					},
					{
						loader: "less-loader",
						options: {
							lessOptions: {
								strictMath: true,
							},
						},
					},
				],
			},
			{
				test: /\.(png|jpe?g|gif)$/i,
				use: [
					{
						loader: "file-loader",
					},
				],
			},
		],
	},
	resolve: {
		alias: {
			jquery: path.join(__dirname, "./public/lib/jquery.stub/main.js"),
		},
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "[name].min.css",
			chunkFilename: "[id].css",
		}),
	],
	watch: true,
	watchOptions: {
		ignored: ["node_modules/**"],
	},
	mode: "production",
};

const exportables = [];
const items = [{ name: "client", path: "client.js" }];
items.map((x) => {
	exportables.push({
		...config,
		name: x.name,
		entry: { [x.name]: path.join(__dirname, "public/", x.path) },
		output: { path: path.join(__dirname, "public"), filename: x.name + ".min.js" },
	});
});

module.exports = [...exportables];
