const Page = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;
  return <div>Artist {id}</div>;
};

export default Page;