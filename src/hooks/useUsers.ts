import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface User {
  address: string;
  displayName: string;
  price: string;
  onlyHumans: boolean;
}

export interface Availability {
  enabled: boolean;
  timezone: string;
  weekdays: {
    start: string;
    end: string;
    enabled: boolean;
  };
  weekends: {
    start: string;
    end: string;
    enabled: boolean;
  };
}

export interface UpdateUserData {
  name: string;
  address: string;
  phoneNumber: string;
  price: string;
  onlyHumans: boolean;
  rules: Array<{ id: string; type: string; value: string; price: string }>;
  availability?: Availability;
}

// Query hook for fetching all users
export const useUsers = () => {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });
};

// Mutation hook for updating user details
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: UpdateUserData) => {
      const response = await fetch('/api/user/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      return response.json();
    },
    onSuccess: () => {
      // Automatically refetch users list after successful update
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
