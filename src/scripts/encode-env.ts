import fs from "fs";

function encodeFile(path: string): string {
	const raw = fs.readFileSync(path, "utf-8");
	return Buffer.from(raw, "utf-8").toString("base64");
}

const leaders = encodeFile("src/secrets/leaders.json");
const addresses = encodeFile("src/secrets/small-group-addresses.json");

console.log("LEADERS_JSON_BASE64=" + leaders);
console.log("GROUP_ADDRESSES_JSON_BASE64=" + addresses);
