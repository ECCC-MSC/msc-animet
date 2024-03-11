export default class IntegerAssigner {
  constructor() {
    this.nextInteger = 0;
    this.mappedIntegers = new Map();
    this.freedIntegers = [];
  }

  addItem(item) {
    if (this.mappedIntegers.has(item)) {
      return;
    }

    if (this.freedIntegers.length === 0) {
      this.mappedIntegers.set(item, this.nextInteger);
      this.nextInteger++;
    } else {
      const freedInteger = this.freedIntegers.shift();
      this.mappedIntegers.set(item, freedInteger);
    }
  }

  removeItem(item) {
    if (!this.mappedIntegers.has(item)) {
      return;
    }
    const integer = this.mappedIntegers.get(item);
    this.mappedIntegers.delete(item);
    this.freedIntegers.push(integer);
    this.freedIntegers.sort(function (a, b) {
      return a - b;
    });
  }

  getItemInteger(item) {
    return this.mappedIntegers.get(item);
  }
}
