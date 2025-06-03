const { Writable } = require('stream');

const HEADER_LENGTH = 16;
const OFFSET_REQUEST_ID = 0;
const OFFSET_SEQUENCE = 4;
const OFFSET_FLAGS = 8;
const OFFSET_RESERVED = 9;
const OFFSET_PAYLOAD_LENGTH = 12;

/**
 * A Duplex stream wrapper over a WebSocket that
 * • Frames each chunk with a small header (requestId, sequence, flags, length)
 * • Honors backpressure based on WebSocket.bufferedAmount
 * • Signals end-of-stream with an “isFinal” flag
 *
 * Header format (16 bytes total):
 *  ┌────────────────────────────────────────────────────┐
 *  │ Bytes 0–3   │ requestId      (uint32, big-endian)  │
 *  ├────────────────────────────────────────────────────┤
 *  │ Bytes 4–7   │ sequenceNumber (uint32, big-endian)  │
 *  ├────────────────────────────────────────────────────┤
 *  │ Byte 8      │ flags (bit 0 = isFinal)              │
 *  ├────────────────────────────────────────────────────┤
 *  │ Bytes 9–11  │ reserved (must be zero)              │
 *  ├────────────────────────────────────────────────────┤
 *  │ Bytes 12–15 │ payloadLength   (uint32, big-endian) │
 *  ├────────────────────────────────────────────────────┤
 *  │ Bytes 16–   │ payload bytes                        │
 *  └────────────────────────────────────────────────────┘
 */
class WebSocketStream extends Writable {
  /**
   * Wraps a WebSocket to provide a stream with framing and backpressure.
   * @param {WebSocket} ws - The raw WebSocket instance
   * @param {object} opts - Options for the stream
   * @param {number} [opts.requestId] - Identifier for the RPC/request this stream belongs to
   * @param {number} [opts.threshold] - WebSocket buffer low-water threshold
   * @param {number} [opts.highWaterMark] - Stream highWaterMark
   */
  constructor(ws, opts = {}) {
    super({ highWaterMark: opts.highWaterMark });
    this.ws = ws;
    this.requestId = opts.requestId;
    this._nextSeq = 1;
    this._threshold = opts.threshold || this.writableHighWaterMark;
  }

  _write(chunk, _, callback) {
    const sequenceNumber = this._nextSeq++;
    const isFinal = false;
    const frame = this._encodeFrame(this.requestId, sequenceNumber, isFinal, chunk);

    this.ws.send(frame, { binary: true }, err => {
      if (err) {
        return this._handleError(err);
      }
    });

    if (this.ws.bufferedAmount > this._threshold) {
      this.ws.once('bufferedAmountLow', () => {
        this.emit('drain');
      });
    } else {
      callback();
    }
  }

  _final(callback) {
    const sequenceNumber = this._nextSeq++;
    const frame = this._encodeFrame(this.requestId, sequenceNumber, true, Buffer.alloc(0));
    this.ws.send(frame, { binary: true }, err => {
      if (err) {
        return this._handleError(err);
      }
      callback();
    });
  }

  _encodeFrame(requestId, seq, isFinal, payload) {
    const header = Buffer.alloc(HEADER_LENGTH);
    header.writeUInt32BE(requestId, OFFSET_REQUEST_ID);
    header.writeUInt32BE(seq, OFFSET_SEQUENCE);
    header.writeUInt8(isFinal ? 1 : 0, OFFSET_FLAGS);
    header.writeUInt32BE(payload.length, OFFSET_PAYLOAD_LENGTH);
    return Buffer.concat([header, payload]);
  }

  _decodeFrame(data) {
    const buffer = Buffer.from(data);
    const payloadLength = buffer.readUInt32BE(OFFSET_PAYLOAD_LENGTH);
    const payload = buffer.slice(HEADER_LENGTH, HEADER_LENGTH + payloadLength);
    return payload;
  }

  _handleError(err) {
    this.destroy(err);
  }
}

module.exports = WebSocketStream;