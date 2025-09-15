# Tally Assembly Operations for Economic Justice Platform
# x86-64 Assembly implementation of core tally operations

.section .data

# Tally state variables
user_tally: .quad 1
network_tally: .quad 1
collective_tally: .quad 0

# Error messages
error_combine: .asciz "Cannot combine tallies - invalid state"
error_separate: .asciz "Cannot separate tallies - invalid state"
success_combine: .asciz "Tallies combined - collective sovereignty activated"
success_separate: .asciz "Tallies separated - individual sovereignty restored"

.section .text

.global tally_combine
.global tally_separate
.global tally_get_status
.global tally_hash_data

# Combine user and network tallies into collective sovereignty
tally_combine:
    push %rbp
    mov %rsp, %rbp

    # Check if we can combine (user=1, network=1)
    leaq user_tally(%rip), %rcx
    movq (%rcx), %rax
    cmpq $1, %rax
    jne combine_error

    leaq network_tally(%rip), %rcx
    movq (%rcx), %rax
    cmpq $1, %rax
    jne combine_error

    # Perform the combination
    movq $0, %rax
    leaq user_tally(%rip), %rcx
    movq %rax, (%rcx)         # user_tally = 0
    leaq network_tally(%rip), %rcx
    movq %rax, (%rcx)         # network_tally = 0

    movq $2, %rax
    leaq collective_tally(%rip), %rcx
    movq %rax, (%rcx)         # collective_tally = 2

    # Return success
    lea success_combine(%rip), %rax
    jmp combine_exit

combine_error:
    lea error_combine(%rip), %rax

combine_exit:
    pop %rbp
    ret

# Separate collective tallies back to individual sovereignty
tally_separate:
    push %rbp
    mov %rsp, %rbp

    # Check if we can separate (collective=2)
    leaq collective_tally(%rip), %rcx
    movq (%rcx), %rax
    cmpq $2, %rax
    jne separate_error

    # Perform the separation
    movq $1, %rax
    leaq user_tally(%rip), %rcx
    movq %rax, (%rcx)         # user_tally = 1
    leaq network_tally(%rip), %rcx
    movq %rax, (%rcx)         # network_tally = 1

    movq $0, %rax
    leaq collective_tally(%rip), %rcx
    movq %rax, (%rcx)         # collective_tally = 0

    # Return success
    lea success_separate(%rip), %rax
    jmp separate_exit

separate_error:
    lea error_separate(%rip), %rax

separate_exit:
    pop %rbp
    ret

# Get current tally status
tally_get_status:
    push %rbp
    mov %rsp, %rbp

    # Return pointer to status structure
    # Structure: { user, network, collective }
    sub $24, %rsp            # Allocate space for return structure

    leaq user_tally(%rip), %rcx
    movq (%rcx), %rax
    movq %rax, (%rsp)

    leaq network_tally(%rip), %rcx
    movq (%rcx), %rax
    movq %rax, 8(%rsp)

    leaq collective_tally(%rip), %rcx
    movq (%rcx), %rax
    movq %rax, 16(%rsp)

    mov %rsp, %rax           # Return pointer to structure

    add $24, %rsp
    pop %rbp
    ret

# Simple hash function for tally data (XOR-based for demonstration)
# Input: rdi = data pointer, rsi = data length
tally_hash_data:
    push %rbp
    mov %rsp, %rbp
    push %rbx
    push %r12

    xor %rax, %rax          # hash = 0
    xor %rbx, %rbx          # index = 0
    mov %rdi, %r12          # save data pointer

hash_loop:
    cmp %rsi, %rbx
    jge hash_done

    mov (%r12, %rbx), %dl   # get byte from data
    xor %dl, %al            # XOR with hash

    # Simple mixing
    rol $3, %rax            # rotate left 3 bits
    add %rbx, %rax          # add index
    xor $0xDEADBEEF, %eax   # XOR with constant (lower 32 bits)

    inc %rbx
    jmp hash_loop

hash_done:
    pop %r12
    pop %rbx
    pop %rbp
    ret

# Tally verification function (checks integrity)
# Input: rdi = expected_hash, rsi = data_ptr, rdx = data_len
tally_verify:
    push %rbp
    mov %rsp, %rbp
    push %rbx
    push %r12
    push %r13

    mov %rdi, %r12          # save expected_hash
    mov %rsi, %r13          # save data_ptr

    # Calculate actual hash
    mov %rsi, %rdi
    mov %rdx, %rsi
    call tally_hash_data

    # Compare with expected
    cmp %r12, %rax
    jne verify_failed

    # Success
    mov $1, %rax
    jmp verify_exit

verify_failed:
    xor %rax, %rax

verify_exit:
    pop %r13
    pop %r12
    pop %rbx
    pop %rbp
    ret

# Tally memory operations (secure zeroing)
.global tally_secure_zero

tally_secure_zero:
    push %rbp
    mov %rsp, %rbp
    push %rbx
    push %r12

    # rdi = pointer, rsi = length
    mov %rdi, %r12
    xor %rbx, %rbx

zero_loop:
    cmp %rsi, %rbx
    jge zero_done

    movb $0, (%r12, %rbx)   # zero byte
    inc %rbx
    jmp zero_loop

zero_done:
    # Memory barrier to ensure writes complete
    mfence

    pop %r12
    pop %rbx
    pop %rbp
    ret

# Tally counter operations (atomic increments)
.global tally_atomic_inc

tally_atomic_inc:
    push %rbp
    mov %rsp, %rbp

    # rdi = pointer to counter
    lock addq $1, (%rdi)

    pop %rbp
    ret

.global tally_atomic_dec

tally_atomic_dec:
    push %rbp
    mov %rsp, %rbp

    # rdi = pointer to counter
    lock subq $1, (%rdi)

    pop %rbp
    ret

