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
    expect(pipe.transform(100).replace(/\s+/, "")).toBe('100 Euro'.replace(/\s+/, ""));
  });

  it('should format the number as an precisions', () => {
    expect(pipe.transform(123.4599, 0).replace(/\s+/, "")).toBe('123 Euro'.replace(/\s+/, ""));
    expect(pipe.transform(123.4599, 1).replace(/\s+/, "")).toBe('123,5 Euro'.replace(/\s+/, ""));
    expect(pipe.transform(123.4509, 3).replace(/\s+/, "")).toBe('123,451 Euro'.replace(/\s+/, ""));

  });

  it('should handle negative numbers correctly', () => {
    expect(pipe.transform(-123.45).replace(/\s+/, "")).toBe('-123,45 Euro'.replace(/\s+/, ""));
  });

  it('should correctly format large numbers with the EUR symbol', () => {
    expect(pipe.transform(123456789.987).replace(/\s+/, "")).toBe('123.456.789,99 Euro'.replace(/\s+/, ""));
  });
});
