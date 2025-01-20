import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'roomPrice'
})
export class RoomPricePipe implements PipeTransform {
  static readonly INVALID_PRICE = 'Unavailable';

  transform(value: string | number | undefined | null, precision: number = 2, currency = 'EUR', local: string = 'de-DE'): string {
    let valueInNumber: number;
    if (typeof value === 'string') {
      valueInNumber = parseFloat(value);
    } else if (typeof value === 'number') {
      valueInNumber = value;
    } else {
      valueInNumber = 0;
    }
    if (!value || value == 0 || isNaN(valueInNumber)) {
      return 'Unavailable';
    }
    return new Intl.NumberFormat(local,
      { 
        style: 'currency',
        currencyDisplay: 'name',
        minimumFractionDigits: 0,
        maximumFractionDigits: precision,
        currency: currency
      }).format(valueInNumber);
  }
}
