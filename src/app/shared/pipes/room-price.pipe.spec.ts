import { RoomPricePipe } from './room-price.pipe';

describe('RoomPricePipe', () => {
  const pipe = new RoomPricePipe();

  it('create an instance', () => {
    const pipe = new RoomPricePipe();
    expect(pipe).toBeTruthy();
  });

  it('should handle invalid cases correctly', () => {
    expect(pipe.transform(undefined)).toBe(RoomPricePipe.INVALID_PRICE);
    expect(pipe.transform(null)).toBe(RoomPricePipe.INVALID_PRICE);
    expect(pipe.transform(0)).toBe(RoomPricePipe.INVALID_PRICE);
    expect(pipe.transform("0")).toBe(RoomPricePipe.INVALID_PRICE);
    expect(pipe.transform("qweqwe")).toBe(RoomPricePipe.INVALID_PRICE);
    expect(pipe.transform(NaN)).toBe(RoomPricePipe.INVALID_PRICE);

  });

  it('should auto add EUR as ccy', () => {
    expect(pipe.transform(1000).replace(/\s+/, "")).toBe('10 Euro'.replace(/\s+/, ""));
  });

  it('the last 2 digit is always cent and rounding', () => {
    expect(pipe.transform(105).replace(/\s+/, "")).toBe('1,05 Euro'.replace(/\s+/, ""));
    expect(pipe.transform(1250).replace(/\s+/, "")).toBe('12,5 Euro'.replace(/\s+/, ""));

  });

  it('should handle negative numbers correctly', () => {
    expect(pipe.transform(-12345).replace(/\s+/, "")).toBe('-123,45 Euro'.replace(/\s+/, ""));
  });

  it('should correctly format large numbers with the EUR symbol', () => {
    expect(pipe.transform(12345678999).replace(/\s+/, "")).toBe('123.456.789,99 Euro'.replace(/\s+/, ""));
  });
});
