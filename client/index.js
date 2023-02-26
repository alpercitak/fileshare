import "./index.less";

const socket_host = document.getElementById("socket-host").value;
const options = { query: {}, forceNew: true };
// eslint-disable-next-line no-undef
const socket = io.connect(`ws://${socket_host}`, options);
const hash = {};

const dataSizeReducer = (accumulator, currentValue) => accumulator + currentValue;

socket.on("connect", () => {
	socket.emit("getPeers");
});

socket.on("getPeers", (ids) => {
	const container = document.getElementById("peers");

	let html = "<div class='item'>Peers (" + ids.length + ")</div>";
	for (let i in ids) {
		html += "<div class='item'>" + ids[i] + "</div>";
	}
	container.innerHTML = html;
});

socket.on("metadata", (data) => {
	if (!hash[data.id]) hash[data.id] = { indexTotal: data.indexTotal, chunks: [] };
	const metadata = JSON.parse(atob(data.id));
	const container = document.getElementById("files");
	const div = document.createElement("div");
	div.classList.add("item");
	div.innerHTML = data.id;
	div.id = data.id;
	div.setAttribute("data-size", metadata.size);
	container.append(div);
});

socket.on("chunk", (data) => {
	if (!hash[data.id]) {
		console.log("not found: " + data.id);
		return {};
	}
	hash[data.id].chunks.push(data);

	Object.keys(hash).forEach((k) => {
		const o = hash[k];
		const container = document.getElementById(k);
		const metadata = JSON.parse(atob(k));
		const dataCurrent = o.chunks.map((x) => parseInt(x.data.length)).reduce(dataSizeReducer);
		const dataTotal = parseInt(container.getAttribute("data-size") || 0);
		const percentage = (dataCurrent / dataTotal) * 100;
		let innerHTML = metadata.name + "<br />" + parseInt(percentage) + " / " + 100 + "%";

		if (o.indexTotal == o.chunks.length) {
			o.chunks = o.chunks.map((x) => {
				x.index = parseInt(x.index);
				return x;
			});
			o.chunks.sort((a, b) => {
				return a.index < b.index ? -1 : 1;
			});
			const base64 = o.chunks.map((x) => x.data).join("");
			innerHTML += " <a href='" + base64 + "' download='" + metadata.name + "'>Download</a>";
		}

		container.innerHTML = innerHTML;
		container.classList.add("progress");
		container.style.width = percentage + "%";
	});
});

(() => {
	const inpFile = document.querySelector("input[type=file]");

	const getBase64 = (file) => {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => {
				return resolve({ data: reader.result });
				// console.log(reader.result);
			};
			reader.onerror = (error) => {
				return resolve({ error: error });
			};
		});
	};

	const chunkSubstr = (str, size) => {
		const numChunks = Math.ceil(str.length / size);
		const chunks = new Array(numChunks);

		for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
			chunks[i] = str.substr(o, size);
		}

		return chunks;
	};

	inpFile.onchange = () => {
		const fileList = inpFile.files;
		const file = fileList[0];

		getBase64(file).then((r) => {
			const chunks = chunkSubstr(r.data, 10000);

			const metadata = {
				now: new Date().getTime() / 1000,
				name: file.name,
				size: r.data.length,
				type: file.type,
			};
			const id = btoa(JSON.stringify(metadata));

			socket.emit("metadata", { id: id, indexTotal: chunks.length });

			for (const i in chunks) {
				// setTimeout(() => {socket.emit("chunk", {id: id, index: i, data: chunks[i]});}, i * 1000);
				socket.emit("chunk", { id: id, index: i, data: chunks[i] });
			}
		});
	};
})();
