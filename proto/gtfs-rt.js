// proto/gtfs-rt.js
// GTFS-RT Protocol Buffer decoder/helper
// Uses protobufjs to decode binary GTFS-RT feeds instead of JSON.

const protobuf = require("protobufjs");
const path = require("path");

let feedMessageType = null;

/**
 * Initialize the GTFS-RT proto decoder.
 * Loads and parses the .proto schema file.
 */
async function initProto() {
  if (feedMessageType) return feedMessageType;
  const root = await protobuf.load(path.join(__dirname, "gtfs-realtime.proto"));
  feedMessageType = root.lookupType("transit_realtime.FeedMessage");
  return feedMessageType;
}

/**
 * Decode a binary GTFS-RT response buffer into a plain JS object.
 *
 * @param {Buffer} buffer - The binary protobuf response
 * @returns {object} Decoded FeedMessage as a plain object
 */
function decodeFeedMessage(buffer) {
  if (!feedMessageType) {
    throw new Error("Proto not initialized. Call initProto() first.");
  }
  const message = feedMessageType.decode(buffer);
  // Convert to plain JS object (with default values filled in)
  return feedMessageType.toObject(message, {
    longs: Number, // convert int64/uint64 to Number
    enums: String, // convert enum values to their string names
    defaults: false, // only include fields that were actually in the data
    arrays: true, // always return arrays
    objects: true, // always return objects
  });
}

/**
 * Fetch a GTFS-RT feed using protocol buffers.
 * Sends a GET request with Accept: application/x-protobuf,
 * then decodes the binary response.
 *
 * @param {string} url - The GTFS-RT endpoint URL
 * @param {object} axiosInstance - An axios instance with API key headers
 * @returns {Promise<object>} Decoded feed message
 */
async function fetchGTFSRT(url, axiosInstance) {
  const response = await axiosInstance.get(url, {
    responseType: "arraybuffer",
    headers: {
      Accept: "application/x-protobuf",
    },
  });
  return decodeFeedMessage(response.data);
}

module.exports = {
  initProto,
  decodeFeedMessage,
  fetchGTFSRT,
};
