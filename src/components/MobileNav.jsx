export default function MobileNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2">
      <button className="text-secondary text-sm">Forums</button>
      <button className="text-secondary text-sm">Wallet</button>
      <button className="text-secondary text-sm">Rings</button>
      <button className="text-secondary text-sm">Profile</button>
    </div>
  );
}
