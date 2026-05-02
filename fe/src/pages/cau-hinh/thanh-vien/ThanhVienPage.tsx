import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Form,
  Select,
  Input,
  Tag,
  Space,
  Popconfirm,
  Radio,
  message,
  Modal,
  Result,
} from 'antd';
import { UserAddOutlined, DeleteOutlined, EditOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { tenantService, TenantMember, AddMemberDto, UpdateMemberDto } from '@/services/tenantService';

const USER_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'GIAM_DOC', label: 'Giám đốc' },
  { value: 'KE_TOAN_TRUONG', label: 'Kế toán trưởng' },
  { value: 'KE_TOAN_QUY', label: 'Kế toán quỹ' },
  { value: 'KE_TOAN_CONG_NO', label: 'Kế toán công nợ' },
  { value: 'KE_TOAN_TONG_HOP', label: 'Kế toán tổng hợp' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'KIEM_SOAT', label: 'Kiểm soát' },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'red',
  GIAM_DOC: 'purple',
  KE_TOAN_TRUONG: 'blue',
  KE_TOAN_QUY: 'cyan',
  KE_TOAN_CONG_NO: 'geekblue',
  KE_TOAN_TONG_HOP: 'volcano',
  MANAGER: 'orange',
  KIEM_SOAT: 'default',
};

const DEFAULT_PASSWORD = '123456';

type AddMode = 'new' | 'existing';

interface UserOption {
  id: string;
  email: string;
  hoTen: string;
}

const ThanhVienPage = () => {
  const { currentTenant } = useAuth();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<TenantMember | null>(null);
  const [addMode, setAddMode] = useState<AddMode>('new');
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const tenantId = currentTenant?.tenantId;

  if (!tenantId) {
    return (
      <div className="p-6">
        <Result
          status="warning"
          title="Chưa chọn công ty"
          subTitle="Vui lòng chọn công ty trước khi quản lý thành viên."
        />
      </div>
    );
  }

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await tenantService.getMembers(tenantId);
      setMembers(data);
    } catch {
      message.error('Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await tenantService.getAllUsers();
      setUsers(data);
    } catch {
      // getAllUsers requires SuperAdmin — Admin won't have access, that's OK
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchUsers();
  }, [tenantId]);

  const handleAdd = async (values: Record<string, string>) => {
    try {
      const dto: AddMemberDto = { role: values.role };
      if (addMode === 'existing') {
        dto.userId = values.userId;
      } else {
        dto.email = values.email;
        dto.hoTen = values.hoTen;
        if (values.password) dto.password = values.password;
      }
      const result = await tenantService.addMember(tenantId, dto);
      message.success(
        result.isNew
          ? `Đã tạo tài khoản ${result.user.email} và thêm vào công ty`
          : `Đã thêm ${result.user.hoTen} vào công ty`,
      );
      setAddModalVisible(false);
      addForm.resetFields();
      fetchMembers();
    } catch {
      message.error('Không thể thêm thành viên');
    }
  };

  const handleEditRole = async () => {
    if (!editingMember) return;
    try {
      const values = editForm.getFieldsValue() as UpdateMemberDto;
      await tenantService.updateMember(tenantId, editingMember.id, values);
      message.success('Đã cập nhật vai trò');
      setEditingMember(null);
      fetchMembers();
    } catch {
      message.error('Không thể cập nhật vai trò');
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await tenantService.removeMember(tenantId, userId);
      message.success('Đã xóa thành viên khỏi công ty');
      fetchMembers();
    } catch {
      message.error('Không thể xóa thành viên');
    }
  };

  const openAddModal = () => {
    setAddMode('new');
    addForm.resetFields();
    addForm.setFieldsValue({ password: DEFAULT_PASSWORD });
    setAddModalVisible(true);
  };

  const getRoleLabel = (role: string) =>
    USER_ROLES.find((r) => r.value === role)?.label || role;

  const availableUsers = users.filter(
    (u) => !members.some((m) => m.id === u.id && m.isActive),
  );

  const columns = [
    {
      title: 'Họ tên',
      dataIndex: 'hoTen',
      key: 'hoTen',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={ROLE_COLORS[role] || 'default'}>{getRoleLabel(role)}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Vô hiệu'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, record: TenantMember) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingMember(record);
              editForm.setFieldsValue({ role: record.role, isActive: record.isActive });
            }}
          />
          <Popconfirm
            title="Xác nhận xóa thành viên?"
            onConfirm={() => handleRemove(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TeamOutlined /> Quản lý Thành viên
          </h1>
          <p className="text-gray-500 mt-1">
            Quản lý thành viên trong {currentTenant?.tenantName || 'công ty'}
          </p>
        </div>
        <Button type="primary" icon={<UserAddOutlined />} onClick={openAddModal}>
          Thêm thành viên
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={members}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Add Member Modal */}
      <Modal
        title="Thêm thành viên"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        footer={null}
        width={450}
      >
        <Form form={addForm} layout="vertical" onFinish={handleAdd}>
          <Form.Item label="Cách thêm">
            <Radio.Group value={addMode} onChange={(e) => setAddMode(e.target.value)}>
              <Radio.Button value="new">
                <UserAddOutlined /> Tạo mới
              </Radio.Button>
              {availableUsers.length > 0 && (
                <Radio.Button value="existing">
                  <UserOutlined /> User có sẵn
                </Radio.Button>
              )}
            </Radio.Group>
          </Form.Item>

          {addMode === 'existing' ? (
            <Form.Item
              name="userId"
              label="Chọn User"
              rules={[{ required: true, message: 'Vui lòng chọn user' }]}
            >
              <Select
                showSearch
                placeholder="Tìm user..."
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) ||
                  (option?.email ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={availableUsers.map((u) => ({
                  value: u.id,
                  label: u.hoTen,
                  email: u.email,
                }))}
                optionRender={(option) => (
                  <div className="flex flex-col">
                    <span>{option.data.label}</span>
                    <span className="text-xs text-gray-400">{option.data.email}</span>
                  </div>
                )}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name="hoTen"
                label="Họ tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input placeholder="VD: Nguyễn Văn A" />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input placeholder="VD: user@congty.com" />
              </Form.Item>
              <Form.Item
                name="password"
                label="Mật khẩu"
                extra={`Mặc định: ${DEFAULT_PASSWORD}`}
              >
                <Input.Password placeholder="Nhập mật khẩu" />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select placeholder="Chọn vai trò" options={USER_ROLES} />
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end">
            <Space>
              <Button onClick={() => setAddModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Thêm</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        title={`Sửa vai trò - ${editingMember?.hoTen || ''}`}
        open={!!editingMember}
        onCancel={() => setEditingMember(null)}
        onOk={handleEditRole}
        okText="Cập nhật"
        cancelText="Hủy"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="role" label="Vai trò">
            <Select options={USER_ROLES} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ThanhVienPage;
