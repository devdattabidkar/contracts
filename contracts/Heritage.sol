//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Heritage is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event NewTestament(
        address testator,
        address inheritor,
        Status status,
        uint256 proofOfTimestamp,
        address token,
        uint16 maxDays
    );

    event TestamentUpdated(
        address testator,
        address inheritor,
        Status status,
        uint256 proofOfTimestamp,
        address token,
        uint16 maxDays
    );

    event Inherited(
        address testator,
        address inheritor,
        Status status,
        uint256 proofOfTimestamp,
        address token,
        uint16 maxDays,
        uint256 balance
    );

    event Revoke(
        address testator,
        address inheritor,
        Status status,
        uint256 proofOfTimestamp,
        address token,
        uint16 maxDays
    );

    enum Status {
        ACTIVE,
        INACTIVE,
        INHERITED
    }

    struct Testator {
        address inheritor;
        Status status;
        uint256 proofOfTimestamp;
        address token;
        uint16 maxDays;
    }

    mapping(address => Testator) private testaments;
    mapping(address => address) private inheritorToTestament;

    modifier onlyTestator() {
        require(
            testaments[msg.sender].inheritor != address(0),
            "The address is not a valid testator."
        );
        _;
    }

    modifier onlyActive() {
        require(
            testaments[msg.sender].status == Status.ACTIVE,
            "The address holder is not active."
        );
        _;
    }

    modifier onlyInheritor() {
        require(
            inheritorToTestament[msg.sender] != address(0),
            "The address is not a valid inheritor."
        );
        _;
    }

    modifier timeAlreadyPassed() {
        Testator storage _testator = testaments[
            inheritorToTestament[msg.sender]
        ];
        uint256 _timestamp = block.timestamp;

        require(
            _timestamp >=
                _testator.proofOfTimestamp + _testator.maxDays * 1 days,
            "The max days did not passed yet."
        );
        _;
    }

    modifier greaterThan(uint16 _maxDays) {
        require(_maxDays > 0, "maxDays should be greater than 0.");
        _;
    }

    modifier uniqueTestator() {
        require(
            testaments[msg.sender].inheritor == address(0),
            "Testator already have a testament."
        );
        _;
    }

    function addTestament(
        address _inheritor,
        address _token,
        uint16 _maxDays
    ) public greaterThan(_maxDays) uniqueTestator {
        require(
            inheritorToTestament[_inheritor] == address(0),
            "Inheritor already have a testament."
        );

        IERC20 token = IERC20(_token);

        uint256 _allowance = token.allowance(msg.sender, address(this));

        require(_allowance > 0, "Token allowance should be greater than 0.");

        Testator memory _testator = Testator(
            _inheritor,
            Status.ACTIVE,
            block.timestamp,
            _token,
            _maxDays
        );

        testaments[msg.sender] = _testator;

        inheritorToTestament[_inheritor] = msg.sender;

        emit NewTestament(
            msg.sender,
            _testator.inheritor,
            _testator.status,
            _testator.proofOfTimestamp,
            _testator.token,
            _testator.maxDays
        );
    }

    function getTestator(address _testatorAddress)
        public
        view
        returns (Testator memory)
    {
        Testator storage _testator = testaments[_testatorAddress];

        require(
            _testator.inheritor != address(0x00),
            "The testator does not exist."
        );

        return _testator;
    }

    function getInheritor(address _inheritorAddress)
        public
        view
        returns (Testator memory)
    {
        Testator storage _testator = testaments[
            inheritorToTestament[_inheritorAddress]
        ];

        require(
            _testator.inheritor != address(0x00),
            "The inheritor does not exist."
        );

        return _testator;
    }

    function updateTestament(
        address _inheritor,
        address _token,
        uint16 _maxDays
    ) public onlyActive onlyTestator {
        uint256 _timestamp = block.timestamp;

        Testator storage _testator = testaments[msg.sender];

        if (
            _timestamp >=
            _testator.proofOfTimestamp + _testator.maxDays * 1 days
        ) {
            _testator.status = Status.INACTIVE;
        } else {
            _testator.inheritor = _inheritor;
            _testator.maxDays = _maxDays;
            _testator.proofOfTimestamp = _timestamp;
            _testator.token = _token;
        }

        emit TestamentUpdated(
            msg.sender,
            _testator.inheritor,
            _testator.status,
            _testator.proofOfTimestamp,
            _testator.token,
            _testator.maxDays
        );
    }

    function updateProof() public {
        Testator storage _testator = testaments[msg.sender];

        updateTestament(
            _testator.inheritor,
            _testator.token,
            _testator.maxDays
        );
    }

    function inherit() public onlyInheritor timeAlreadyPassed nonReentrant {
        Testator storage _testator = testaments[
            inheritorToTestament[msg.sender]
        ];

        IERC20 token = IERC20(_testator.token);
        uint256 _balance = token.balanceOf(inheritorToTestament[msg.sender]);

        _testator.status = Status.INHERITED;

        token.safeTransferFrom(
            inheritorToTestament[msg.sender],
            msg.sender,
            _balance
        );

        emit Inherited(
            inheritorToTestament[msg.sender],
            msg.sender,
            _testator.status,
            _testator.proofOfTimestamp,
            _testator.token,
            _testator.maxDays,
            _balance
        );
    }

    function revoke() public onlyTestator onlyActive {
        Testator memory _testator = testaments[msg.sender];

        delete inheritorToTestament[_testator.inheritor];
        delete testaments[msg.sender];

        emit Revoke(
            msg.sender,
            _testator.inheritor,
            _testator.status,
            _testator.proofOfTimestamp,
            _testator.token,
            _testator.maxDays
        );
    }
}
