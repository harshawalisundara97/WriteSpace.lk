import { getMyAddresses } from "@/lib/account/addresses";
import { AddressBook } from "@/components/account/address-book";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const addresses = await getMyAddresses();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Delivery addresses</h1>
        <p className="mt-1 text-sm text-ink-soft">Save the places we deliver to, so checkout is one tap.</p>
      </div>
      <AddressBook addresses={addresses} />
    </div>
  );
}
