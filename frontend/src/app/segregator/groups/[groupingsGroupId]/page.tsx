import GroupingsGroupDetail from '@/components/GroupingsGroupDetail';

export default function SegregatorGroupPage({ params }: { params: { groupingsGroupId: string } }) {
  return (
    <main>
      <GroupingsGroupDetail groupId={params.groupingsGroupId} />
    </main>
  );
}