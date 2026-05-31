export class order_book {
	add(order: number): number {
		const tmp = order + 1;
		const enabled = tmp > 0;
		console.log("added");

		return enabled ? tmp : order;
	}
}
