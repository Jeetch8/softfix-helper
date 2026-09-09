import GroupingsGroupDetail from '@/components/GroupingsGroupDetail';

export default async function SegregatorGroupPage({ params }: { params: Promise<{ groupingsGroupId: string }> }) {
  const { groupingsGroupId } = await params;
  return (
    <main>
      <GroupingsGroupDetail groupId={groupingsGroupId} />
    </main>
  );
}
