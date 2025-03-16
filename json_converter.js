const encodeText = (data) => new TextEncoder().encode(data);
const decodeText = (data) => new TextDecoder().decode(data);

const parseCsvToJson = (keys, dataInArray) => {
  const jsonObjects = dataInArray.map((line) => {
    const values = line.split(",");

    return Object.fromEntries(values.map((value, i) => [keys[i], value]));
  });

  return jsonObjects;
};

const trimJsonBrackets = (objects) => {
  const stringfy = JSON.stringify(objects);
  const encoded = [...encodeText(stringfy)].slice(1, -1);
  encoded.push(encodeText(","));

  return new Uint8Array(encoded);
};

const convertToJson = new TransformStream({
  keys: [],
  firstChunk: true,

  transform(chunk, controller) {
    const dataInArray = decodeText(chunk).trim().split("\n");

    if (this.firstChunk) {
      this.firstChunk = false;
      const header = dataInArray.shift();
      this.keys = header.split(",");
      controller.enqueue(encodeText("["));
    }

    const jsonObjects = parseCsvToJson(this.keys, dataInArray);
    controller.enqueue(trimJsonBrackets(jsonObjects));
  },

  flush(controller) {
    controller.enqueue(encodeText("]"));
  },
});

const main = async () => {
  const csvData = await Deno.open("./sample.csv", { read: true });
  const outputFile = await Deno.open("./output.json", {
    write: true,
    create: true,
    append: false,
  });

  csvData.readable.pipeThrough(convertToJson).pipeTo(outputFile.writable);
};

main();
