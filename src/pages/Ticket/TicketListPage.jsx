import { Table, Space, Button } from 'antd';
import { useSWR } from 'swr';

const columns = [
  { title: '工单编号', dataIndex: 'id' },
  { title: '标题', dataIndex: 'title' },
  { title: '状态', dataIndex: 'status' },
  { title: '优先级', dataIndex: 'priority' },
  {
    title: '操作',
    render: (_, record) => (
      <Space>
        <Button onClick={() => handleView(record.id)}>查看</Button>
        <Button type="primary" onClick={() => handleEdit(record.id)}>
          编辑
        </Button>
      </Space>
    )
  }
];

export default function TicketListPage() {
  const { data, error } = useSWR('/api/tickets', fetcher);

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-bold">工单列表</h2>
        <Button type="primary" href="/tickets/create">
          新建工单
        </Button>
      </div>
      <Table 
        columns={columns} 
        dataSource={data?.tickets} 
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
} 